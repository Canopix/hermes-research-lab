"""Quick smoke test for the providers endpoint."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
HEADERS = {"X-API-Key": "agenthub-local"}

def test_providers_returns_defaults():
    r = client.get("/api/system/providers", headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert "default_provider" in data
    assert "default_model" in data
    assert "options" in data
    assert isinstance(data["options"], list)
    assert len(data["options"]) >= 1
    default_opt = [o for o in data["options"] if o.get("is_default")]
    assert len(default_opt) == 1
    print(f"✅ Providers: {len(data['options'])} option(s), default={data['default_provider']}/{data['default_model']}")

if __name__ == "__main__":
    test_providers_returns_defaults()
