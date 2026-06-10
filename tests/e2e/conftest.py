import os
import sys
import json
import signal
import socket
import subprocess
import time
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread

import pytest


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
TEMPLATES_SRC = REPO_ROOT / "templates"
EXPLORE_API_DIR = REPO_ROOT / "explore-api"


def _find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class _MockHermesHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self._respond(200, {"status": "ok"})
        elif self.path == "/api/jobs":
            self._respond(200, [])
        else:
            self._respond(404, {"error": "not found"})

    def do_POST(self):
        if self.path == "/api/jobs":
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length:
                self.rfile.read(content_length)
            self._respond(200, {"id": "job-test-1", "status": "active"})
        else:
            self._respond(404, {"error": "not found"})

    def _respond(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())

    def log_message(self, format, *args):
        pass


@pytest.fixture(scope="session")
def hermes_home(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("hermes_home")
    skills_dir = tmp / "skills"
    profiles_dir = tmp / "profiles"
    skills_dir.mkdir(parents=True)
    profiles_dir.mkdir(parents=True)
    for template_dir in sorted(TEMPLATES_SRC.iterdir()):
        if template_dir.is_dir():
            src = template_dir / "SKILL.md"
            if src.exists():
                dst = skills_dir / template_dir.name / "SKILL.md"
                dst.parent.mkdir(parents=True, exist_ok=True)
                dst.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
    return tmp


@pytest.fixture(scope="function")
def mock_hermes():
    server = ThreadingHTTPServer(("127.0.0.1", 0), _MockHermesHandler)
    port = server.server_address[1]
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f"http://127.0.0.1:{port}"
    yield base_url
    server.shutdown()


@pytest.fixture(scope="function")
def explore_api():
    _processes = []

    def _start(hermes_home_path, hermes_api_url):
        port = _find_free_port()
        env = os.environ.copy()
        env["HERMES_HOME"] = str(hermes_home_path)
        env["HERMES_API_URL"] = hermes_api_url
        proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--port", str(port), "--host", "127.0.0.1"],
            cwd=str(EXPLORE_API_DIR),
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        _processes.append(proc)
        base_url = f"http://127.0.0.1:{port}"
        deadline = time.time() + 15
        while time.time() < deadline:
            try:
                import httpx
                r = httpx.get(f"{base_url}/health", timeout=2)
                if r.status_code == 200:
                    return base_url
            except Exception:
                pass
            time.sleep(0.3)
        raise RuntimeError(f"explore-api did not start within 15s on port {port}")
    yield _start
    for proc in _processes:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()