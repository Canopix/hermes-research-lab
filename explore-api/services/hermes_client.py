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
            headers={"Authorization": f"Bearer {self.api_key}"},
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

    # ── Jobs CRUD ───────────────────────────────────────────────

    async def get_jobs(self, limit: int = 50) -> list[dict]:
        """GET /jobs — list all jobs."""
        try:
            resp = await self._client.get("/api/jobs", params={"limit": limit})
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else data.get("jobs", [])
        except httpx.HTTPError:
            return []

    async def get_job(self, job_id: str) -> dict | None:
        """GET /jobs/{id} — get a single job."""
        try:
            resp = await self._client.get(f"/api/jobs/{job_id}")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError:
            return None

    async def create_job(self, data: dict) -> dict | None:
        """POST /jobs — create a new job."""
        try:
            resp = await self._client.post("/api/jobs", json=data)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError:
            return None

    async def update_job(self, job_id: str, data: dict) -> dict | None:
        """PATCH /jobs/{id} — update a job."""
        try:
            resp = await self._client.patch(f"/api/jobs/{job_id}", json=data)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError:
            return None

    async def delete_job(self, job_id: str) -> bool:
        """DELETE /jobs/{id} — delete a job."""
        try:
            resp = await self._client.delete(f"/api/jobs/{job_id}")
            resp.raise_for_status()
            return True
        except httpx.HTTPError:
            return False

    async def pause_job(self, job_id: str) -> dict | None:
        """POST /jobs/{id}/pause — pause a job."""
        try:
            resp = await self._client.post(f"/api/jobs/{job_id}/pause")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError:
            return None

    async def resume_job(self, job_id: str) -> dict | None:
        """POST /jobs/{id}/resume — resume a job."""
        try:
            resp = await self._client.post(f"/api/jobs/{job_id}/resume")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError:
            return None

    async def trigger_job(self, job_id: str) -> dict | None:
        """POST /jobs/{id}/trigger — trigger a job run."""
        try:
            resp = await self._client.post(f"/api/jobs/{job_id}/trigger")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError:
            return None

    async def get_job_outputs(self, job_id: str) -> list[dict]:
        """GET /jobs/{id}/outputs — get outputs for a job."""
        try:
            resp = await self._client.get(f"/api/jobs/{job_id}/outputs")
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else data.get("outputs", [])
        except httpx.HTTPError:
            return []

    # ── System info ─────────────────────────────────────────────

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
