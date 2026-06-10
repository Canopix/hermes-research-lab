"""System endpoints: overview, health."""

from __future__ import annotations

from pathlib import Path

import yaml
from fastapi import APIRouter, HTTPException

from config import HERMES_HOME
from services.hermes_client import get_client

router = APIRouter(tags=["system"])


@router.get("/health")
async def health() -> dict:
    """GET /health — basic health check for the Exploration API itself."""
    return {"status": "ok", "service": "exploration-api"}


@router.get("/api/system/overview")
async def system_overview() -> dict:
    """GET /api/system/overview — aggregate system stats."""
    client = await get_client()

    health_data = await client.get_health()
    jobs = await client.get_jobs()
    skills = await client.get_skills()
    toolsets = await client.get_toolsets()

    # Count profiles locally using HERMES_HOME
    profiles_dir = Path(HERMES_HOME) / "profiles"
    profiles_count = 0
    if profiles_dir.is_dir():
        profiles_count = len([d for d in profiles_dir.iterdir() if d.is_dir()])

    # Count hooks
    hooks_dir = Path(HERMES_HOME) / "hooks"
    hooks_count = 0
    if hooks_dir.is_dir():
        hooks_count = len([f for f in hooks_dir.iterdir() if f.is_file()])

    return {
        "profiles_count": profiles_count,
        "jobs_count": len(jobs),
        "skills_count": len(skills),
        "toolsets_count": len(toolsets),
        "hooks_count": hooks_count,
        "health": health_data,
    }


@router.get("/v1/skills")
async def list_skills() -> list[dict]:
    """GET /v1/skills — list all installed skills."""
    client = await get_client()
    skills = await client.get_skills()
    return skills


@router.get("/v1/toolsets")
async def list_toolsets() -> list[dict]:
    """GET /v1/toolsets — list all available toolsets."""
    client = await get_client()
    toolsets = await client.get_toolsets()
    return toolsets


@router.get("/api/system/config")
async def get_global_config() -> dict:
    """GET /api/system/config — read global config.yaml."""
    config_path = Path(HERMES_HOME) / "config.yaml"
    if not config_path.is_file():
        raise HTTPException(status_code=404, detail="No global config.yaml found")
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            content = f.read()
        parsed = yaml.safe_load(content)
        return {
            "content": content,
            "parsed": parsed,
        }
    except (yaml.YAMLError, OSError) as exc:
        raise HTTPException(status_code=500, detail=f"Error reading config: {exc}")
