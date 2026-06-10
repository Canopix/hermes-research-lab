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
                "config": {"topic": "Test Topic", "depth": "deep"},
            },
            headers={"Authorization": "Bearer agenthub-local"},
        )
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            prompt = data.get("prompt", "")
            if "Test Topic" in prompt:
                print("PASS: config value found in prompt")
            else:
                print("FAIL: config value NOT in prompt")
            if "Configuration" in prompt:
                print("PASS: Configuration section injected")
            else:
                print("FAIL: Configuration section NOT injected")
            print(f"Prompt length: {len(prompt)}")
        else:
            print(f"Error: {resp.text}")

asyncio.run(test())
