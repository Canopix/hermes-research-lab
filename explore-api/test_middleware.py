"""Quick test of the API key middleware."""
import asyncio
import sys

sys.path.insert(0, "/root/agenthub/explore-api")

from httpx import AsyncClient, ASGITransport
from main import app

async def test_middleware():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test 1: Health without API key → should 200
        r = await client.get("/api/health")
        print(f"GET /api/health (no key) → {r.status_code}: {r.json()}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"

        # Test 2: System overview without API key → should 401
        r = await client.get("/api/system/overview")
        print(f"GET /api/system/overview (no key) → {r.status_code}: {r.json()}")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"

        # Test 3: System overview with correct API key → should 200 or error from backend
        r = await client.get("/api/system/overview", headers={"X-API-Key": "agenthub-local"})
        print(f"GET /api/system/overview (correct key) → {r.status_code}: {r.json() if r.status_code < 500 else r.text[:200]}")
        # Should NOT be 401 — may fail for other reasons (backend unreachable) but middleware should pass
        assert r.status_code != 401, f"Expected not 401, got {r.status_code}"

        # Test 4: Bearer token auth
        r = await client.get("/api/system/overview", headers={"Authorization": "Bearer agenthub-local"})
        print(f"GET /api/system/overview (Bearer key) → {r.status_code}")
        assert r.status_code != 401, f"Expected not 401, got {r.status_code}"

        # Test 5: Wrong API key → should 401
        r = await client.get("/api/system/overview", headers={"X-API-Key": "wrong-key"})
        print(f"GET /api/system/overview (wrong key) → {r.status_code}: {r.json()}")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"

    print("\n✅ All 5 tests passed!")

if __name__ == "__main__":
    asyncio.run(test_middleware())
