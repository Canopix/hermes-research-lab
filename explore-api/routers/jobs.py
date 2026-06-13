"""Jobs router — proxies all jobs CRUD + SSE to the Hermes API Server.

This router lets the frontend talk only to the Exploration API (port 8643).
The Exploration API then proxies requests to the Hermes API Server (port 8642).
"""

from __future__ import annotations

import asyncio
import httpx
import json
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any

from config import HERMES_API_KEY, HERMES_API_URL
from services.hermes_client import get_client
from services.job_outputs import list_job_outputs, list_all_job_outputs
from services.profile_provision import (
    ProfileProvisionError,
    delete_agent_profile,
    is_agenthub_profile,
    provision_agent_profile,
)
from services.template_parser import TEMPLATES_DIR, get_template, render_preview

router = APIRouter(tags=["jobs"])


def _wizard_payload_to_hermes_job(body: dict, *, profile_name: str | None = None) -> dict:
    """Transform AgentHub wizard payload into a Hermes API Server job."""
    template_id = body.get("template", "")
    tmpl = get_template(template_id, TEMPLATES_DIR) if template_id else None
    hermes_config = (tmpl or {}).get("hermesConfig") or {}

    prompt = body.get("prompt") or ""
    if not prompt.strip() and body.get("config") is not None:
        prompt = render_preview(template_id, body.get("config"), TEMPLATES_DIR)
        config_values = body.get("config") or {}
        if config_values:
            prompt += "\n\n## Configuration\n" + json.dumps(config_values, indent=2)

    payload: dict[str, Any] = {
        "name": body.get("name") or template_id or "agent",
        "prompt": prompt,
        "schedule": body.get("schedule", "0 */6 * * *"),
        "deliver": body.get("deliver", hermes_config.get("deliver", "local")),
    }

    if profile_name:
        payload["profile"] = profile_name

    # Skills: user selection > template defaults
    skills = body.get("skills") or hermes_config.get("skills") or []
    if skills:
        payload["skills"] = skills

    # Toolsets: user selection > template defaults
    toolsets = body.get("enabled_toolsets") or hermes_config.get("toolsets") or []
    if toolsets:
        payload["enabled_toolsets"] = toolsets

    # Model: user selection > template defaults
    model = body.get("model") or hermes_config.get("model")
    if model:
        payload["model"] = model

    return payload


# ── GET /api/jobs ──────────────────────────────────────────────
@router.get("/api/jobs")
async def list_jobs(limit: int = 50) -> list[dict]:
    """List all jobs from the Hermes API Server."""
    client = await get_client()
    return await client.get_jobs(limit=limit)


# ── GET /api/jobs/{id} ────────────────────────────────────────
@router.get("/api/jobs/{job_id}")
async def get_job(job_id: str) -> dict:
    """Get a single job by ID."""
    client = await get_client()
    job = await client.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job


# ── POST /api/jobs ────────────────────────────────────────────
@router.post("/api/jobs")
async def create_job(request: Request) -> dict:
    """Create a new job.

    Accepts either:
    - Raw Hermes API Server payload (pass-through)
    - AgentHub wizard payload: { name, template, config, prompt }
      which gets transformed into a proper Hermes API Server job.
    """
    raw_body = await request.json()

    if "template" in raw_body:
        try:
            profile_name = await provision_agent_profile(
                template_id=raw_body.get("template", ""),
                agent_name=raw_body.get("name") or raw_body.get("template", "agent"),
                config=raw_body.get("config") or {},
            )
        except ProfileProvisionError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

        body = _wizard_payload_to_hermes_job(raw_body, profile_name=profile_name)
    else:
        body = raw_body
        profile_name = body.get("profile")

    client = await get_client()
    job = await client.create_job(body)
    if job is None:
        raise HTTPException(status_code=502, detail="Hermes API Server rejected job creation")

    if profile_name and isinstance(job, dict):
        job["profile"] = profile_name
    return job


# ── PATCH /api/jobs/{id} ──────────────────────────────────────
@router.patch("/api/jobs/{job_id}")
async def update_job(job_id: str, request: Request) -> dict:
    """Update a job."""
    body = await request.json()
    client = await get_client()
    job = await client.update_job(job_id, body)
    if job is None:
        raise HTTPException(status_code=500, detail="Failed to update job")
    return job


# ── DELETE /api/jobs/{id} ─────────────────────────────────────
@router.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str) -> dict:
    """Delete a job and its AgentHub profile (agent-*) when linked."""
    client = await get_client()
    job = await client.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    profile_name = job.get("profile") if isinstance(job, dict) else None

    ok = await client.delete_job(job_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete job")

    profile_deleted = False
    if profile_name:
        try:
            await delete_agent_profile(profile_name)
            profile_deleted = is_agenthub_profile(profile_name)
        except ProfileProvisionError as exc:
            raise HTTPException(
                status_code=exc.status_code,
                detail=(
                    f"Job deleted but failed to remove profile '{profile_name}': "
                    f"{exc.message}"
                ),
            ) from exc

    result: dict[str, Any] = {"status": "deleted", "id": job_id}
    if profile_name:
        result["profile"] = profile_name
        result["profile_deleted"] = profile_deleted
    return result


# ── POST /api/jobs/{id}/pause ─────────────────────────────────
@router.post("/api/jobs/{job_id}/pause")
async def pause_job(job_id: str) -> dict:
    """Pause a job."""
    client = await get_client()
    job = await client.pause_job(job_id)
    if job is None:
        raise HTTPException(status_code=500, detail="Failed to pause job")
    return job


# ── POST /api/jobs/{id}/resume ────────────────────────────────
@router.post("/api/jobs/{job_id}/resume")
async def resume_job(job_id: str) -> dict:
    """Resume a paused job."""
    client = await get_client()
    job = await client.resume_job(job_id)
    if job is None:
        raise HTTPException(status_code=500, detail="Failed to resume job")
    return job


# ── POST /api/jobs/{id}/trigger (alias) ───────────────────────
# ── POST /api/jobs/{id}/run ───────────────────────────────────
@router.post("/api/jobs/{job_id}/trigger")
@router.post("/api/jobs/{job_id}/run")
async def trigger_job(job_id: str) -> dict:
    """Trigger a job run now (proxies Hermes POST /api/jobs/{id}/run)."""
    client = await get_client()
    job = await client.trigger_job(job_id)
    if job is None:
        raise HTTPException(
            status_code=502,
            detail="Hermes API Server rejected run request — check Hermes logs",
        )
    return job


# ── GET /api/jobs/{id}/outputs ────────────────────────────────
@router.get("/api/jobs/{job_id}/outputs")
async def get_job_outputs(job_id: str) -> list[dict]:
    """Get outputs/executions for a job.

    Reads ~/.hermes/cron/output/{id}/*.md first (fast, reliable).
    Falls back to Hermes API only if no local files exist.
    """
    disk_outputs = await list_job_outputs(job_id)
    if disk_outputs:
        return disk_outputs
    client = await get_client()
    return await client.get_job_outputs(job_id)


@router.get("/api/reports")
async def list_reports() -> list[dict]:
    """All agent reports from disk — single call for the history UI."""
    return await list_all_job_outputs()


# ── SSE proxy: GET /api/jobs/{id}/events ──────────────────────
@router.get("/api/jobs/{job_id}/events")
async def proxy_job_events(job_id: str, encoding: str = "json") -> StreamingResponse:
    """Stream SSE events from the Hermes API Server for a given run.

    Proxies /v1/runs/{job_id}/events from the Hermes API Server,
    forwarding the event stream to the frontend.
    """
    url = f"{HERMES_API_URL}/v1/runs/{job_id}/events?encoding={encoding}"
    headers = {"Authorization": f"Bearer {HERMES_API_KEY}", "Accept": "text/event-stream"}

    async def event_generator():
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(300.0)) as client:
                async with client.stream("GET", url, headers=headers) as resp:
                    if resp.status_code != 200:
                        yield f"data: {{\"type\": \"error\", \"data\": {{\"message\": \"Hermes API returned {resp.status_code}\"}}}}\n\n"
                        return
                    async for line in resp.aiter_lines():
                        yield line + "\n"
        except (httpx.HTTPError, asyncio.CancelledError):
            yield 'data: {"type": "error", "data": {"message": "SSE proxy connection lost"}}\n\n'

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Run status proxy: GET /api/jobs/{id}/run ──────────────────
@router.get("/api/jobs/{job_id}/run")
async def proxy_job_run_status(job_id: str) -> dict:
    """Proxy /v1/runs/{job_id} from the Hermes API Server (for SSE polling fallback)."""
    try:
        async with httpx.AsyncClient(
            base_url=HERMES_API_URL,
            headers={"Authorization": f"Bearer {HERMES_API_KEY}"},
            timeout=httpx.Timeout(10.0),
        ) as client:
            resp = await client.get(f"/v1/runs/{job_id}")
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Hermes API Server unavailable")
