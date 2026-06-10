"""Tests for system overview endpoints in the Exploration API."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient

from main import app

API_KEY = os.environ.get("HERMES_API_KEY", "agenthub-local")
HEADERS = {"X-API-Key": API_KEY}

client = TestClient(app)


def test_health():
    """GET /health returns status ok."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "exploration-api"


def test_health_alias():
    """GET /api/health returns status ok."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


def test_system_overview():
    """GET /api/system/overview returns system stats."""
    resp = client.get("/api/system/overview", headers=HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    # Check expected keys exist
    assert "profiles_count" in data
    assert "jobs_count" in data
    assert "skills_count" in data
    assert "toolsets_count" in data
    assert "hooks_count" in data
    assert "health" in data
    # All counts should be non-negative integers
    for key in ("profiles_count", "jobs_count", "skills_count", "toolsets_count", "hooks_count"):
        assert isinstance(data[key], int)
        assert data[key] >= 0


def test_list_skills():
    """GET /v1/skills returns a list."""
    resp = client.get("/v1/skills", headers=HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_list_toolsets():
    """GET /v1/toolsets returns a list."""
    resp = client.get("/v1/toolsets", headers=HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_global_config():
    """GET /api/system/config returns config.yaml content."""
    resp = client.get("/api/system/config", headers=HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert "content" in data
    assert "parsed" in data


def test_system_unauthorized():
    """GET /api/system/overview without API key returns 401."""
    resp = client.get("/api/system/overview")
    assert resp.status_code == 401
