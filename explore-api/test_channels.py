"""Quick smoke test for the channels endpoint."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from main import app

API_KEY = os.environ.get("HERMES_API_KEY", "agenthub-local")
HEADERS = {"X-API-Key": API_KEY}
client = TestClient(app)

def test_channels_returns_list():
    r = client.get("/api/system/channels", headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    ids = [c["id"] for c in data]
    assert "local" in ids
    assert "origin" in ids
    for ch in data:
        assert "id" in ch
        assert "name" in ch
        assert "icon" in ch
        assert "description" in ch
    print(f"✅ Channels: {len(data)} option(s): {', '.join(ids)}")

if __name__ == "__main__":
    test_channels_returns_list()
