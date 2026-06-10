import os
import shutil
from pathlib import Path

import pytest
import httpx


TEMPLATE_IDS = ["ai-researcher", "repo-monitor", "paper-summarizer", "competitor-watcher"]


def _clean_profiles(hermes_home: Path):
    profiles_dir = hermes_home / "profiles"
    if profiles_dir.exists():
        for p in profiles_dir.iterdir():
            if p.is_dir() and p.name.startswith("agent-"):
                shutil.rmtree(p)


@pytest.fixture(autouse=True)
def _auto_clean_profiles(hermes_home):
    yield
    _clean_profiles(hermes_home)


@pytest.fixture(scope="function")
def api(explore_api, hermes_home, mock_hermes):
    base_url = explore_api(hermes_home, mock_hermes)
    return httpx.Client(base_url=base_url)


class TestHealth:
    def test_health(self, api):
        resp = api.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "healthy"}


class TestOverview:
    def test_overview(self, api):
        resp = api.get("/api/system/overview")
        assert resp.status_code == 200
        data = resp.json()
        assert data["templates_count"] == 4


class TestListTemplates:
    def test_list_templates(self, api):
        resp = api.get("/api/templates")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 4
        ids = {t["id"] for t in data}
        for tid in TEMPLATE_IDS:
            assert tid in ids


class TestTemplatePreview:
    def test_template_preview(self, api):
        resp = api.get("/api/templates/ai-researcher/preview", params={"topics": "X", "max_results": "3"})
        assert resp.status_code == 200
        data = resp.json()
        assert "rendered_prompt" in data
        assert data["rendered_prompt"].strip() != ""


class TestCreateAgent:
    def test_create_agent_creates_profile_and_job(self, api, hermes_home):
        resp = api.post(
            "/api/templates/ai-researcher/create-agent",
            json={"config": {"topics": "agentes IA", "frequency": "Diario", "max_results": "3"}},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["profile_created"] is True
        assert data["job_created"] is True
        assert data["job"]["id"] == "job-test-1"

        soul_path = hermes_home / "profiles" / "agent-ai-researcher" / "SOUL.md"
        assert soul_path.exists()
        soul_text = soul_path.read_text(encoding="utf-8")
        assert "topics" in soul_text
        assert "agentes IA" in soul_text

    def test_create_agent_degrades_without_hermes(self, explore_api, hermes_home):
        dead_port = 29871
        base_url = explore_api(hermes_home, f"http://127.0.0.1:{dead_port}")
        client = httpx.Client(base_url=base_url)
        resp = client.post(
            "/api/templates/ai-researcher/create-agent",
            json={"config": {"topics": "test", "frequency": "Diario", "max_results": "1"}},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["profile_created"] is True
        assert data["job_created"] is False
        assert "warning" in data

    def test_create_agent_unknown_template_404(self, api):
        resp = api.post(
            "/api/templates/no-existe/create-agent",
            json={"config": {"topics": "test"}},
        )
        assert resp.status_code == 404