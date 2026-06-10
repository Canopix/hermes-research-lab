"""Tests for template endpoints in the Exploration API."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient

from main import app

API_KEY = os.environ.get("HERMES_API_KEY", "agenthub-local")
HEADERS = {"X-API-Key": API_KEY}

client = TestClient(app)


def test_list_templates():
    """GET /api/templates returns a list of available templates."""
    resp = client.get("/api/templates", headers=HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0
    for t in data:
        assert "id" in t
        assert "name" in t
        assert "icon" in t


def test_get_template_not_found():
    """GET /api/templates/{nonexistent} returns 404."""
    resp = client.get("/api/templates/nonexistent_template_xyz", headers=HEADERS)
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


def test_preview_template_not_found():
    """POST /api/templates/{nonexistent}/preview returns 404."""
    resp = client.post(
        "/api/templates/nonexistent_template_xyz/preview",
        headers=HEADERS,
        json={},
    )
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


def test_health():
    """GET /health returns status ok."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "exploration-api"


def test_health_alias():
    """GET /api/health returns status ok (alias endpoint)."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "exploration-api"


def test_get_valid_template():
    """GET /api/templates/ai-researcher returns template details."""
    resp = client.get("/api/templates/ai-researcher", headers=HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "ai-researcher"
    assert "name" in data
    assert "description" in data
    assert "body" in data


def test_preview_valid_template():
    """POST /api/templates/ai-researcher/preview returns rendered prompt."""
    resp = client.post(
        "/api/templates/ai-researcher/preview",
        headers=HEADERS,
        json={"topic": "test topic"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["template_id"] == "ai-researcher"
    assert "prompt" in data
    assert "config" in data


def test_templates_unauthorized():
    """GET /api/templates without API key returns 401."""
    resp = client.get("/api/templates")
    assert resp.status_code == 401
    assert "invalid or missing api key" in resp.json()["detail"].lower()
