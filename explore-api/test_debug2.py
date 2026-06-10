import asyncio, json
from httpx import AsyncClient, ASGITransport
from main import app

async def test():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/api/jobs",
            json={
                "name": "test-agent",
                "template": "ai-researcher",
                "config": {"sources": "http://test.com", "frequency": "diario", "language": "español", "include_tts": "true", "max_items": "5"},
            },
            headers={"Authorization": "Bearer agenthub-local"},
        )
        print(f"Status: {resp.status_code}")
        print(f"Full response: {json.dumps(resp.json(), indent=2)}")

asyncio.run(test())
