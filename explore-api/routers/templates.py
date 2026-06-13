"""Template endpoints: list, detail, preview.

Templates live in <project>/templates/<template_id>/
Each template has:
  - soul.md       (required) — the agent's personality + prompt with {{placeholders}}
  - params.yaml   (optional) — parameter definitions
  - hermes.yaml   (optional) — technical config (model, toolsets, deliver)
"""

from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException, Body

from services.template_parser import scan_templates, get_template, render_preview


def _validate_id(id_str: str) -> str:
    """Validate that an ID contains only safe characters."""
    if not re.match(r'^[a-zA-Z0-9_-]+$', id_str):
        raise HTTPException(status_code=400, detail=f"Invalid ID format: {id_str}")
    return id_str

router = APIRouter(tags=["templates"])


@router.get("/api/templates")
async def list_templates() -> list[dict]:
    """GET /api/templates — list all available templates."""
    return scan_templates()


@router.get("/api/templates/{template_id}")
async def get_template_detail(template_id: str) -> dict:
    """GET /api/templates/{template_id} — get full template details."""
    _validate_id(template_id)
    tmpl = get_template(template_id)
    if tmpl is None:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")
    return tmpl


@router.post("/api/templates/{template_id}/preview")
async def preview_template(template_id: str, config: dict = Body(default={})) -> dict:
    """POST /api/templates/{template_id}/preview — render soul.md with config.

    Replaces {{param_name}} placeholders with user-provided values,
    falling back to defaults from params.yaml for any missing keys.
    """
    _validate_id(template_id)
    tmpl = get_template(template_id)
    if tmpl is None:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")

    rendered = render_preview(template_id, config)

    return {
        "template_id": template_id,
        "prompt": rendered,
        "config": {
            "params": tmpl["params"],
            "hermesConfig": tmpl["hermesConfig"],
        },
    }