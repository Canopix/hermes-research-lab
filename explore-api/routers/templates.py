from typing import Any
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from services.template_service import TemplateService
from services.hermes_reader import get_hermes_dir

router = APIRouter()


class CreateAgentRequest(BaseModel):
    config: dict[str, str]
    delivery: str | None = None
    delivery_target: str | None = None


@router.get("")
async def get_templates():
    return TemplateService.list_templates()


@router.get("/{template_id}")
async def get_template(template_id: str):
    template = TemplateService.get_template(template_id)
    if not template:
        raise HTTPException(404, f"Template '{template_id}' not found")
    return template


@router.get("/{template_id}/preview")
async def get_template_preview(template_id: str, request: Request):
    params = dict(request.query_params)
    params.pop("template_id", None)
    result = TemplateService.preview(template_id, params)
    if not result:
        raise HTTPException(404, f"Template '{template_id}' not found")
    return result


@router.post("/{template_id}/create-agent")
async def create_agent(template_id: str, body: CreateAgentRequest):
    import os
    import httpx

    template = TemplateService.get_template(template_id)
    if not template:
        raise HTTPException(404, f"Template '{template_id}' not found")

    profile_name = f"agent-{template_id}"
    profile_dir = get_hermes_dir() / "profiles" / profile_name
    profile_dir.mkdir(parents=True, exist_ok=True)

    soul_lines = [f"# {template['name']}", "", template.get("description", ""), "", "## Configuración"]
    for key, value in body.config.items():
        soul_lines.append(f"- **{key}:** {value}")
    (profile_dir / "SOUL.md").write_text("\n".join(soul_lines) + "\n")

    rendered = TemplateService.preview(template_id, body.config)["rendered_prompt"]

    freq = body.config.get("frequency", "")
    schedule_map = {"Diario": "every 24h", "Cada 12 horas": "every 12h", "Semanal": "every 7d"}
    schedule = schedule_map.get(freq, "every 24h")

    job_data = {
        "prompt": rendered,
        "skills": [template_id],
        "profile": profile_name,
        "schedule": schedule,
        "delivery": body.delivery or "origin",
    }

    hermes_url = os.environ.get("HERMES_API_URL", "http://localhost:8642")
    headers = {}
    api_key = os.environ.get("HERMES_API_KEY")
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{hermes_url}/api/jobs",
                json=job_data,
                headers=headers,
                timeout=5,
            )
            resp.raise_for_status()
            return {
                "profile": profile_name,
                "profile_created": True,
                "job_created": True,
                "job": resp.json(),
            }
    except Exception:
        return {
            "profile": profile_name,
            "profile_created": True,
            "job_created": False,
            "warning": "Hermes API Server (:8642) no disponible — el profile se creó pero el job no",
        }
