"""Extra endpoints: hooks, mcp-servers, activity, cron-overview."""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

import yaml
from fastapi import APIRouter

from config import HERMES_HOME
from services.hermes_client import get_client

router = APIRouter(tags=["extras"])


@router.get("/api/system/hooks")
async def list_hooks() -> list[dict]:
    """GET /api/system/hooks — list hook scripts in ~/.hermes/hooks/."""
    hooks_dir = Path(HERMES_HOME) / "hooks"
    result = []

    if hooks_dir.is_dir():
        for item in sorted(hooks_dir.iterdir()):
            if item.is_file():
                stat = item.stat()
                is_exec = os.access(item, os.X_OK)
                result.append({
                    "name": item.name,
                    "path": str(item),
                    "executable": is_exec,
                    "size": stat.st_size,
                    "modified": stat.st_mtime,
                })

    return result


@router.get("/api/system/mcp-servers")
async def list_mcp_servers() -> list[dict]:
    """GET /api/system/mcp-servers — read MCP server configs."""
    mcp_servers = []

    top_config = Path(HERMES_HOME) / "config.yaml"
    if top_config.is_file():
        config = _load_yaml(top_config)
        if config and isinstance(config, dict):
            servers = config.get("mcp_servers", config.get("mcp-servers", {}))
            if isinstance(servers, dict):
                for name, cfg in servers.items():
                    mcp_servers.append({"name": name, "config": cfg})
            elif isinstance(servers, list):
                for srv in servers:
                    if isinstance(srv, dict):
                        mcp_servers.append(srv)

    profiles_dir = Path(HERMES_HOME) / "profiles"
    if profiles_dir.is_dir():
        for profile in profiles_dir.iterdir():
            if not profile.is_dir():
                continue
            profile_config = profile / "config.yaml"
            if profile_config.is_file():
                config = _load_yaml(profile_config)
                if config and isinstance(config, dict):
                    servers = config.get("mcp_servers", config.get("mcp-servers", {}))
                    if isinstance(servers, dict):
                        for name, cfg in servers.items():
                            mcp_servers.append({
                                "name": f"{profile.name}/{name}",
                                "config": cfg,
                                "profile": profile.name,
                            })
                    elif isinstance(servers, list):
                        for srv in servers:
                            if isinstance(srv, dict):
                                mcp_servers.append({**srv, "profile": profile.name})

    return mcp_servers


@router.get("/api/system/activity")
async def get_activity() -> dict:
    """GET /api/system/activity — read activity log from monitoring hook."""
    hooks_dir = Path(HERMES_HOME) / "hooks"
    log_path = hooks_dir / "activity.log"

    if log_path.is_file():
        try:
            content = await asyncio.to_thread(log_path.read_text, encoding="utf-8")
            return {
                "source": str(log_path),
                "content": content,
                "lines": len(content.splitlines()),
            }
        except OSError:
            pass

    return {
        "source": None,
        "content": "",
        "lines": 0,
        "note": "No activity log found. Ensure the monitoring hook is installed.",
    }


@router.get("/api/system/cron-overview")
async def cron_overview() -> list[dict]:
    """GET /api/system/cron-overview — aggregate cron jobs from all profiles."""
    jobs = []
    profiles_dir = Path(HERMES_HOME) / "profiles"

    if not profiles_dir.is_dir():
        return jobs

    for profile in profiles_dir.iterdir():
        if not profile.is_dir():
            continue
        config = _load_yaml(profile / "config.yaml")
        if not config or not isinstance(config, dict):
            continue

        cron_jobs = (
            config.get("cron_jobs", config.get("scheduled_jobs", config.get("cron", [])))
        )
        if isinstance(cron_jobs, list):
            for job in cron_jobs:
                if isinstance(job, dict):
                    job["profile"] = profile.name
                    jobs.append(job)
                elif isinstance(job, str):
                    jobs.append({"name": job, "profile": profile.name, "raw": job})

        cron_dict = config.get("cron", {})
        if isinstance(cron_dict, dict):
            for name, cfg in cron_dict.items():
                jobs.append({"name": name, "config": cfg, "profile": profile.name})

    return jobs


def _load_yaml(path: Path) -> dict | None:
    """Load a YAML file, return None on error."""
    if not path.is_file():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    except (yaml.YAMLError, OSError):
        return None
