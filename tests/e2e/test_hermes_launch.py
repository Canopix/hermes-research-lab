"""Opt-in end-to-end test: launch a *created* profile in the real Hermes and
verify it behaves (completes a one-shot run with non-empty output).

This makes REAL LLM calls, so it is skipped unless RUN_LLM_E2E=1 and only runs
if the user's real ~/.hermes has a provider config to copy into the isolated
temp home. Run it with:

    RUN_LLM_E2E=1 <venv>/bin/python -m pytest tests/e2e/test_hermes_launch.py -v
"""
import os
import shutil
import subprocess
from pathlib import Path

import pytest
import httpx


pytestmark = pytest.mark.skipif(
    not os.environ.get("RUN_LLM_E2E"),
    reason="requiere hermes real + provider; set RUN_LLM_E2E=1",
)

REAL_HERMES = Path.home() / ".hermes"


def _provision_provider_config(hermes_home: Path) -> bool:
    """Copy the user's real provider config into the isolated temp home so the
    launched profile inherits a model/provider. Returns False if there's none."""
    real_config = REAL_HERMES / "config.yaml"
    if not real_config.exists():
        return False
    shutil.copy(real_config, hermes_home / "config.yaml")
    for extra in (".env", "auth.json"):
        src = REAL_HERMES / extra
        if src.exists():
            shutil.copy(src, hermes_home / extra)
    return True


def test_created_profile_launches_in_hermes(hermes_home, mock_hermes, explore_api):
    if not _provision_provider_config(hermes_home):
        pytest.skip("no ~/.hermes/config.yaml available to provide a provider")

    # 1. Create the agent (and its profile) through the API.
    base_url = explore_api(hermes_home, mock_hermes)
    client = httpx.Client(base_url=base_url)
    resp = client.post(
        "/api/templates/ai-researcher/create-agent",
        json={"config": {"topics": "test LLM", "frequency": "Diario", "max_results": "1"}},
    )
    assert resp.status_code == 200
    profile_name = resp.json()["profile"]

    env = os.environ.copy()
    env["HERMES_HOME"] = str(hermes_home)

    # 2. Select the created profile (no global --profile flag exists in hermes).
    use = subprocess.run(
        ["hermes", "profile", "use", profile_name],
        capture_output=True, text=True, env=env, timeout=60,
    )
    assert use.returncode == 0, f"`hermes profile use {profile_name}` failed:\n{use.stderr}"

    # 3. Launch the profile with a deterministic one-shot prompt and assert it
    #    behaves: completes successfully with non-empty output.
    try:
        result = subprocess.run(
            ["hermes", "-z", "Responde unicamente con la palabra OK"],
            capture_output=True, text=True, timeout=180, env=env,
        )
    except subprocess.TimeoutExpired:
        pytest.fail("hermes one-shot run timed out after 180s")
    except FileNotFoundError:
        pytest.fail("hermes binary not found in PATH")

    assert result.returncode == 0, (
        f"hermes exited with code {result.returncode}\n"
        f"stdout:\n{result.stdout}\n"
        f"stderr:\n{result.stderr}"
    )
    assert result.stdout.strip(), f"hermes produced empty stdout\nstderr:\n{result.stderr}"
