"""Tests for wizard job creation with profile provisioning."""

from __future__ import annotations

import sys
import os
from unittest.mock import AsyncMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient

from main import app
from services.profile_provision import ProfileProvisionError

API_KEY = os.environ.get("HERMES_API_KEY", "agenthub-local")
HEADERS = {"X-API-Key": API_KEY}

client = TestClient(app)


@patch("routers.jobs.get_client")
@patch("routers.jobs.provision_agent_profile", new_callable=AsyncMock)
def test_create_job_wizard_includes_profile(mock_provision, mock_get_client):
    mock_provision.return_value = "agent-ai-researcher-test-agent"
    mock_client = AsyncMock()
    mock_client.create_job.return_value = {"id": "job-123", "name": "Test Agent"}
    mock_get_client.return_value = mock_client

    resp = client.post(
        "/api/jobs",
        json={
            "name": "Test Agent",
            "template": "ai-researcher",
            "config": {"topic": "AI Safety"},
            "prompt": "Research AI safety trends",
            "schedule": "0 */6 * * *",
            "deliver": "local",
        },
        headers=HEADERS,
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["profile"] == "agent-ai-researcher-test-agent"

    mock_provision.assert_awaited_once()
    mock_client.create_job.assert_awaited_once()
    payload = mock_client.create_job.await_args.args[0]
    assert payload["profile"] == "agent-ai-researcher-test-agent"
    assert payload["enabled_toolsets"] == ["web", "terminal"]


@patch("routers.jobs.get_client")
@patch("routers.jobs.provision_agent_profile", new_callable=AsyncMock)
def test_create_job_provision_failure_does_not_create_job(mock_provision, mock_get_client):
    mock_provision.side_effect = ProfileProvisionError("Hermes CLI not available", status_code=503)
    mock_client = AsyncMock()
    mock_get_client.return_value = mock_client

    resp = client.post(
        "/api/jobs",
        json={
            "name": "Test Agent",
            "template": "ai-researcher",
            "config": {},
        },
        headers=HEADERS,
    )

    assert resp.status_code == 503
    assert "Hermes CLI not available" in resp.json()["detail"]
    mock_client.create_job.assert_not_awaited()


@patch("routers.jobs.get_client")
def test_create_job_raw_payload_pass_through(mock_get_client):
    mock_client = AsyncMock()
    mock_client.create_job.return_value = {"id": "job-456", "name": "Raw Job", "profile": "custom"}
    mock_get_client.return_value = mock_client

    resp = client.post(
        "/api/jobs",
        json={
            "name": "Raw Job",
            "prompt": "Do something",
            "profile": "custom",
        },
        headers=HEADERS,
    )

    assert resp.status_code == 200
    mock_client.create_job.assert_awaited_once()
    payload = mock_client.create_job.await_args.args[0]
    assert payload["profile"] == "custom"


@patch("routers.jobs.delete_agent_profile", new_callable=AsyncMock)
@patch("routers.jobs.get_client")
def test_delete_job_cascades_agent_profile(mock_get_client, mock_delete_profile):
    mock_client = AsyncMock()
    mock_client.get_job.return_value = {
        "id": "job-789",
        "name": "Test Agent",
        "profile": "agent-ai-researcher-test",
    }
    mock_client.delete_job.return_value = True
    mock_get_client.return_value = mock_client

    resp = client.delete("/api/jobs/job-789", headers=HEADERS)

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "deleted"
    assert data["profile"] == "agent-ai-researcher-test"
    assert data["profile_deleted"] is True
    mock_client.delete_job.assert_awaited_once_with("job-789")
    mock_delete_profile.assert_awaited_once_with("agent-ai-researcher-test")


@patch("routers.jobs.delete_agent_profile", new_callable=AsyncMock)
@patch("routers.jobs.get_client")
def test_delete_job_skips_non_agent_profile(mock_get_client, mock_delete_profile):
    mock_client = AsyncMock()
    mock_client.get_job.return_value = {
        "id": "job-790",
        "name": "Legacy Agent",
        "profile": "pilot-leads",
    }
    mock_client.delete_job.return_value = True
    mock_get_client.return_value = mock_client

    resp = client.delete("/api/jobs/job-790", headers=HEADERS)

    assert resp.status_code == 200
    data = resp.json()
    assert data["profile_deleted"] is False
    mock_delete_profile.assert_awaited_once_with("pilot-leads")


@patch("routers.jobs.get_client")
def test_delete_job_not_found(mock_get_client):
    mock_client = AsyncMock()
    mock_client.get_job.return_value = None
    mock_get_client.return_value = mock_client

    resp = client.delete("/api/jobs/missing-job", headers=HEADERS)

    assert resp.status_code == 404
    mock_client.delete_job.assert_not_awaited()
