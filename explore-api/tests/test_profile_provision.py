"""Tests for profile provisioning service."""

from __future__ import annotations

import sys
import os
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.profile_provision import (
    ProfileProvisionError,
    resolve_profile_name,
    slugify_agent_name,
    provision_agent_profile,
)


def test_slugify_agent_name_basic():
    assert slugify_agent_name("AI Researcher Daily") == "ai-researcher-daily"


def test_slugify_agent_name_accents_and_spaces():
    assert slugify_agent_name("  Agente Ñoño  ") == "agente-o-o"


def test_slugify_agent_name_empty_fallback():
    assert slugify_agent_name("!!!") == "agent"


def test_slugify_agent_name_truncates():
    long_name = "a" * 50
    assert len(slugify_agent_name(long_name)) <= 24


@patch("services.profile_provision.profile_exists", return_value=False)
def test_resolve_profile_name_unique(_mock_exists):
    name = resolve_profile_name("ai-researcher", "Daily Report")
    assert name == "agent-ai-researcher-daily-report"


@patch("services.profile_provision.profile_exists")
def test_resolve_profile_name_adds_suffix_on_collision(mock_exists):
    mock_exists.side_effect = lambda n: n in {
        "agent-ai-researcher-daily-report",
        "agent-ai-researcher-daily-report-2",
    }
    name = resolve_profile_name("ai-researcher", "Daily Report")
    assert name == "agent-ai-researcher-daily-report-3"


@patch("services.profile_provision.profile_exists", return_value=True)
def test_resolve_profile_name_exhausts_suffixes(_mock_exists):
    with pytest.raises(ProfileProvisionError) as exc:
        resolve_profile_name("ai-researcher", "Daily Report")
    assert exc.value.status_code == 409
    assert "unique profile name" in exc.value.message.lower()


@patch("services.profile_provision._write_soul_md")
@patch("services.profile_provision._create_profile_via_cli")
@patch("services.profile_provision.resolve_profile_name", return_value="agent-ai-researcher-test")
@pytest.mark.asyncio
async def test_provision_agent_profile_success(mock_resolve, mock_create, mock_soul):
    profile = await provision_agent_profile(
        "ai-researcher",
        "Test Agent",
        {"topic": "AI Safety"},
    )
    assert profile == "agent-ai-researcher-test"
    mock_create.assert_called_once()
    mock_soul.assert_called_once_with(
        "agent-ai-researcher-test",
        "ai-researcher",
        {"topic": "AI Safety"},
    )


@patch("services.profile_provision.shutil.which", return_value=None)
@pytest.mark.asyncio
async def test_provision_agent_profile_no_hermes_cli(_mock_which):
    with pytest.raises(ProfileProvisionError) as exc:
        await provision_agent_profile("ai-researcher", "Test Agent", {})
    assert exc.value.status_code == 503


@patch("services.profile_provision._run_hermes")
@patch("services.profile_provision.profile_exists", return_value=True)
def test_delete_agent_profile_invokes_hermes_cli(mock_exists, mock_run):
    import asyncio
    from services.profile_provision import delete_agent_profile

    asyncio.run(delete_agent_profile("agent-ai-researcher-test"))
    mock_run.assert_called_once_with(["profile", "delete", "agent-ai-researcher-test", "--yes"])


@patch("services.profile_provision._run_hermes")
def test_delete_agent_profile_skips_non_agent_prefix(_mock_run):
    import asyncio
    from services.profile_provision import delete_agent_profile

    asyncio.run(delete_agent_profile("pilot-leads"))
    _mock_run.assert_not_called()


def test_is_agenthub_profile():
    from services.profile_provision import is_agenthub_profile

    assert is_agenthub_profile("agent-ai-researcher-test") is True
    assert is_agenthub_profile("pilot-leads") is False
    assert is_agenthub_profile(None) is False
    assert is_agenthub_profile("") is False


@pytest.mark.integration
@patch("services.profile_provision._write_soul_md")
@pytest.mark.asyncio
async def test_provision_agent_profile_integration(mock_soul):
    import shutil

    if not shutil.which("hermes"):
        pytest.skip("Hermes CLI not available")

    profile_name = "agent-ai-researcher-integration-test"
    try:
        from services.profile_provision import _run_hermes, profile_exists

        if profile_exists(profile_name):
            _run_hermes(["profile", "delete", profile_name, "--yes"], check=False)

        name = await provision_agent_profile(
            "ai-researcher",
            "Integration Test",
            {"topic": "Testing"},
            description="Integration test profile",
        )
        assert name.startswith("agent-ai-researcher-")
        mock_soul.assert_called_once()
    finally:
        from services.profile_provision import _run_hermes, profile_exists

        if profile_exists(profile_name):
            _run_hermes(["profile", "delete", profile_name, "--yes"], check=False)
