from fastapi import APIRouter

from services.hermes_reader import (
    get_hermes_version,
    get_provider,
    list_profiles,
    list_hooks,
    get_mcp_servers,
    get_activity,
)
from services.template_service import TemplateService

router = APIRouter()


@router.get("/overview")
async def get_overview():
    profiles = list_profiles()
    return {
        "hermes_version": get_hermes_version(),
        "provider": get_provider(),
        "profiles": [
            {
                "name": p["name"],
                "model": p["model"],
                "skills_count": p["skills_count"],
            }
            for p in profiles
        ],
        "templates_count": len(TemplateService.list_templates()),
        "total_skills": sum(p["skills_count"] for p in profiles),
    }


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/hooks")
async def get_hooks():
    return list_hooks()


@router.get("/mcp-servers")
async def get_mcp_servers():
    return get_mcp_servers()


@router.get("/activity")
async def get_activity(limit: int = 50):
    return get_activity(limit)
