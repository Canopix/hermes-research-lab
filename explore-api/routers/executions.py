"""Executions API — list, filter, and detail executions from the Hermes API Server.

Endpoints:
  GET /api/executions          — list executions with optional filters
  GET /api/executions/{id}     — get a single execution by ID
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Query

from services.hermes_client import get_client

logger = logging.getLogger("exploration-api.executions")

router = APIRouter(tags=["executions"])


@router.get("/api/executions")
async def list_executions(
    status: str | None = Query(None, description="Filter by status: running, completed, failed, cancelled"),
    agent_id: str | None = Query(None, description="Filter by agent ID"),
    template_id: str | None = Query(None, description="Filter by template ID"),
    limit: int = Query(50, ge=1, le=200, description="Max results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> dict[str, Any]:
    """GET /api/executions — list executions with optional filters.

    Filters are applied client-side from the raw Hermes API response.
    """
    client = await get_client()

    # Fetch jobs from Hermes API Server — executions are represented as jobs/tasks
    try:
        jobs = await client.get_jobs(limit=limit + offset)
    except Exception as exc:
        logger.error("Failed to fetch executions: %s", exc)
        return {"executions": [], "total": 0, "offset": offset, "limit": limit}

    # Normalize job entries into execution records
    executions = []
    for job in jobs:
        if not isinstance(job, dict):
            continue

        # Determine status
        job_status = job.get("status", "unknown")

        # Apply filters
        if status and job_status != status:
            continue
        if agent_id and job.get("agent_id", job.get("profile", "")) != agent_id:
            continue
        if template_id and job.get("template_id", job.get("skill", "")) != template_id:
            continue

        executions.append({
            "id": job.get("id", job.get("task_id", "")),
            "status": job_status,
            "agent_id": job.get("agent_id", job.get("profile", "")),
            "template_id": job.get("template_id", job.get("skill", "")),
            "title": job.get("title", ""),
            "body": job.get("body", ""),
            "created_at": job.get("created_at", ""),
            "started_at": job.get("started_at", ""),
            "completed_at": job.get("completed_at", ""),
            "result": job.get("result", ""),
        })

    total = len(executions)
    page = executions[offset:offset + limit]

    return {
        "executions": page,
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/api/executions/{execution_id}")
async def get_execution(execution_id: str) -> dict[str, Any]:
    """GET /api/executions/{id} — get a single execution by ID."""
    client = await get_client()

    try:
        jobs = await client.get_jobs(limit=1000)
    except Exception as exc:
        logger.error("Failed to fetch executions: %s", exc)
        return {"error": f"Failed to fetch executions: {exc}"}

    for job in jobs:
        if not isinstance(job, dict):
            continue
        job_id = job.get("id", job.get("task_id", ""))
        if job_id == execution_id:
            return {
                "id": job_id,
                "status": job.get("status", "unknown"),
                "agent_id": job.get("agent_id", job.get("profile", "")),
                "template_id": job.get("template_id", job.get("skill", "")),
                "title": job.get("title", ""),
                "body": job.get("body", ""),
                "created_at": job.get("created_at", ""),
                "started_at": job.get("started_at", ""),
                "completed_at": job.get("completed_at", ""),
                "result": job.get("result", ""),
                "metadata": job.get("metadata", {}),
            }

    return {"error": f"Execution '{execution_id}' not found"}
