import asyncio
from services.hermes_client import get_client

async def test():
    client = await get_client()
    print("Client OK:", client)

asyncio.run(test())
