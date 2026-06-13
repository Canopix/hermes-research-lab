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
    """GET /v1/skills — list all installed skills with metadata."""
    client = await get_client()
    skills = await client.get_skills()
    enriched = []
    for s in skills:
        enriched.append({
            "name": s.get("name", ""),
            "description": s.get("description", ""),
            "category": s.get("category", "general"),
        })
    return enriched


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


@router.get("/api/system/channels")
async def list_delivery_channels() -> list[dict]:
    """GET /api/system/channels — list available delivery targets."""
    config_path = Path(HERMES_HOME) / "config.yaml"

    channels = [
        {
            "id": "local",
            "name": "Archivo local",
            "icon": "📁",
            "description": "Guarda en ~/.hermes/cron/output/",
        },
        {
            "id": "origin",
            "name": "Chat actual",
            "icon": "💬",
            "description": "Envía al chat donde se ejecuta",
        },
    ]

    if config_path.is_file():
        try:
            config = yaml.safe_load(config_path.read_text())
            gateway = config.get("gateway", {})
            platforms = gateway.get("platforms", {})

            if platforms.get("telegram", {}).get("enabled"):
                channels.append({
                    "id": "telegram",
                    "name": "Telegram",
                    "icon": "📱",
                    "description": "Envía a Telegram",
                    "supports_chat_id": True,
                    "supports_thread_id": True,
                })

            if platforms.get("discord", {}).get("enabled"):
                channels.append({
                    "id": "discord",
                    "name": "Discord",
                    "icon": "🎮",
                    "description": "Envía a Discord",
                })

            if platforms.get("slack", {}).get("enabled"):
                channels.append({
                    "id": "slack",
                    "name": "Slack",
                    "icon": "💼",
                    "description": "Envía a Slack",
                })
        except (yaml.YAMLError, OSError):
            pass

    channels.append({
        "id": "all",
        "name": "Todos los canales",
        "icon": "🌐",
        "description": "Fan out a todos los canales conectados",
    })

    return channels


@router.get("/api/system/providers")
async def list_providers() -> dict:
    """GET /api/system/providers — list configured providers and default model from config.yaml."""
    config_path = Path(HERMES_HOME) / "config.yaml"
    if not config_path.is_file():
        return {"default_provider": None, "default_model": None, "options": []}
    
    try:
        config = yaml.safe_load(config_path.read_text())
    except (yaml.YAMLError, OSError):
        return {"default_provider": None, "default_model": None, "options": []}
    
    default = config.get("model", {})
    providers = config.get("providers", {})
    fallback = config.get("fallback_providers", [])
    
    options = []
    
    options.append({
        "id": "default",
        "name": default.get("provider", "custom"),
        "model": default.get("model", ""),
        "base_url": default.get("base_url", ""),
        "is_default": True,
    })
    
    for name, prov in providers.items():
        options.append({
            "id": name,
            "name": name,
            "model": prov.get("model", ""),
            "base_url": prov.get("base_url", ""),
            "is_default": False,
        })
    
    for fb in fallback:
        fb_name = fb if isinstance(fb, str) else fb.get("name", "unknown")
        fb_model = fb.get("model", "") if isinstance(fb, dict) else ""
        options.append({
            "id": f"fallback:{fb_name}",
            "name": fb_name,
            "model": fb_model,
            "base_url": "",
            "is_default": False,
        })
    
    return {
        "default_provider": default.get("provider"),
        "default_model": default.get("model"),
        "options": options,
    }
