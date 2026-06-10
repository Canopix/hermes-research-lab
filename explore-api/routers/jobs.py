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

router = APIRouter(tags=["jobs"])


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
    body = await request.json()

    # ── Orchestration: transform wizard payload → Hermes API job ──
    if "template" in body and "prompt" in body:
        # Frontend sent a pre-rendered prompt (from previewTemplate)
        import os
        from services.template_parser import parse_skill_md

        template_id = body["template"]
        templates_dir = os.path.join(
            os.path.expanduser("~/.hermes"), "skills", "agenthub-templates", template_id
        )
        skill_md = os.path.join(templates_dir, "SKILL.md")
        parsed = parse_skill_md(skill_md)

        hermes_config = parsed["hermes_config"] if parsed else {}
        toolsets = hermes_config.get("toolsets", [])
        skills_list = hermes_config.get("skills", [])

        body = {
            "name": body.get("name") or template_id,
            "prompt": body["prompt"],
            "schedule": body.get("schedule", "0 */6 * * *"),  # default: every 6h
            "enabled_toolsets": toolsets if toolsets else None,
            "skills": skills_list if skills_list else None,
            "deliver": body.get("deliver", "local"),
        }

    elif "template" in body and "config" in body:
        # Frontend sent template + config but NO prompt.
        # We need to render the prompt from the template + config ourselves.
        import os
        from services.template_parser import parse_skill_md, render_preview

        template_id = body["template"]
        templates_dir = os.path.join(
            os.path.expanduser("~/.hermes"), "skills", "agenthub-templates", template_id
        )
        skill_md_path = os.path.join(templates_dir, "SKILL.md")

        # Parse frontmatter for toolsets/skills
        parsed = parse_skill_md(skill_md_path)
        hermes_config = parsed["hermes_config"] if parsed else {}
        toolsets = hermes_config.get("toolsets", [])
        skills_list = hermes_config.get("skills", [])

        # Render prompt from template + config
        config_values = body.get("config", {})
        rendered_prompt = render_preview(skill_md_path, params=config_values)

        # Inject config values as context so the agent knows them
        if config_values:
            injected_context = "\n\n## Configuration\n" + json.dumps(config_values, indent=2)
            rendered_prompt = rendered_prompt + injected_context

        body = {
            "name": body.get("name") or template_id,
            "prompt": rendered_prompt,
            "schedule": body.get("schedule", "0 */6 * * *"),
            "enabled_toolsets": toolsets if toolsets else None,
            "skills": skills_list if skills_list else None,
            "deliver": body.get("deliver", "local"),
        }

    client = await get_client()
    job = await client.create_job(body)
    if job is None:
        raise HTTPException(status_code=500, detail="Failed to create job")
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
    """Delete a job."""
    client = await get_client()
    ok = await client.delete_job(job_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete job")
    return {"status": "deleted", "id": job_id}


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


# ── POST /api/jobs/{id}/trigger ───────────────────────────────
@router.post("/api/jobs/{job_id}/trigger")
async def trigger_job(job_id: str) -> dict:
    """Trigger a job run."""
    client = await get_client()
    job = await client.trigger_job(job_id)
    if job is None:
        raise HTTPException(status_code=500, detail="Failed to trigger job")
    return job


# ── GET /api/jobs/{id}/outputs ────────────────────────────────
@router.get("/api/jobs/{job_id}/outputs")
async def get_job_outputs(job_id: str) -> list[dict]:
    """Get outputs/executions for a job."""
    client = await get_client()
    return await client.get_job_outputs(job_id)


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
