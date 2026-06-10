"""Tests for profile endpoints in the Exploration API."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient

from main import app

API_KEY = os.environ.get("HERMES_API_KEY", "agenthub-local")
HEADERS = {"X-API-Key": API_KEY}

client = TestClient(app)


def test_list_profiles():
    """GET /api/system/profiles returns a list of profiles."""
    resp = client.get("/api/system/profiles", headers=HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    # Each profile should have basic fields
    for p in data:
        assert "name" in p
        assert "description" in p
        assert "skills" in p


def test_get_profile_not_found():
    """GET /api/system/profiles/{nonexistent} returns 404."""
    resp = client.get("/api/system/profiles/nonexistent_profile_xyz", headers=HEADERS)
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


def test_get_profile_memory_not_found():
    """GET /api/system/profiles/{nonexistent}/memory returns 404."""
    resp = client.get(
        "/api/system/profiles/nonexistent_profile_xyz/memory",
        headers=HEADERS,
    )
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


def test_get_profile_config_not_found():
    """GET /api/system/profiles/{nonexistent}/config returns 404."""
    resp = client.get(
        "/api/system/profiles/nonexistent_profile_xyz/config",
        headers=HEADERS,
    )
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


def test_profiles_unauthorized():
    """GET /api/system/profiles without API key returns 401."""
    resp = client.get("/api/system/profiles")
    assert resp.status_code == 401
