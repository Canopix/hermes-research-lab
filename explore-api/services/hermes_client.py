"""Async httpx client for the Hermes API Server (:8642)."""

from __future__ import annotations

import httpx

from config import HERMES_API_KEY, HERMES_API_URL


class HermesClient:
    """Async httpx client that proxies requests to the Hermes API Server."""

    def __init__(self, base_url: str | None = None, api_key: str | None = None) -> None:
        self.base_url = (base_url or HERMES_API_URL).rstrip("/")
        self.api_key = api_key or HERMES_API_KEY
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"X-API-Key": self.api_key},
            timeout=httpx.Timeout(10.0),
        )

    async def get_health(self) -> dict:
        """GET /api/system/health — returns health status of the API Server."""
        try:
            resp = await self._client.get("/api/system/health")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            return {"status": "unhealthy", "error": str(exc)}

    async def get_jobs(self, limit: int = 50) -> list[dict]:
        """GET /api/system/jobs — list jobs from the API Server."""
        try:
            resp = await self._client.get("/api/system/jobs", params={"limit": limit})
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else data.get("jobs", [])
        except httpx.HTTPError as exc:
            return []

    async def get_skills(self) -> list[dict]:
        """GET /api/system/skills — list installed skills."""
        try:
            resp = await self._client.get("/api/system/skills")
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else data.get("skills", [])
        except httpx.HTTPError as exc:
            return []

    async def get_toolsets(self) -> list[dict]:
        """GET /api/system/toolsets — list available toolsets."""
        try:
            resp = await self._client.get("/api/system/toolsets")
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else data.get("toolsets", [])
        except httpx.HTTPError as exc:
            return []

    async def get_profiles(self) -> list[dict]:
        """GET /api/system/profiles — list profiles from the API Server."""
        try:
            resp = await self._client.get("/api/system/profiles")
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else data.get("profiles", [])
        except httpx.HTTPError as exc:
            return []

    async def get_sessions(self, limit: int = 50) -> list[dict]:
        """GET /api/system/sessions — list sessions from the API Server."""
        try:
            resp = await self._client.get("/api/system/sessions", params={"limit": limit})
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else data.get("sessions", [])
        except httpx.HTTPError as exc:
            return []

    async def close(self) -> None:
        """Close the underlying httpx client."""
        await self._client.aclose()


# Module-level singleton for convenience
_client: HermesClient | None = None


async def get_client() -> HermesClient:
    """Return a shared HermesClient singleton."""
    global _client
    if _client is None:
        _client = HermesClient()
    return _client


async def close_client() -> None:
    """Close the shared client."""
    global _client
    if _client is not None:
        await _client.close()
        _client = None
