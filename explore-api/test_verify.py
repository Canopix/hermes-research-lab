import asyncio, json
from httpx import AsyncClient, ASGITransport
from main import app

async def test():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/api/jobs",
            json={
                "name": "test-agent-config",
                "template": "ai-researcher",
                "config": {"sources": "http://test.com", "frequency": "diario", "language": "español", "include_tts": "true", "max_items": "5"},
            },
            headers={"Authorization": "Bearer agenthub-local"},
        )
        data = resp.json()
        prompt = data["job"]["prompt"]
        
        checks = [
            ("Template body present", "# 🔬 AI Researcher" in prompt),
            ("Config value 'http://test.com' in prompt", "http://test.com" in prompt),
            ("Config value '5' in prompt", "`5`" in prompt),
            ("Config value 'español' in prompt", "español" in prompt),
            ("Config value 'diario' in prompt", "diario" in prompt),
            ("Configuration section injected", "## Configuration" in prompt),
            ("Config JSON present", '"sources": "http://test.com"' in prompt),
            ("Skills present", "blogwatcher" in data["job"].get("skills", [])),
            ("Toolsets present", data["job"].get("enabled_toolsets") == ["web", "tts"]),
        ]
        
        all_pass = True
        for name, result in checks:
            status = "PASS" if result else "FAIL"
            if not result:
                all_pass = False
            print(f"  [{status}] {name}")
        
        if all_pass:
            print("\n✅ All checks passed!")
        else:
            print("\n❌ Some checks failed")

asyncio.run(test())
