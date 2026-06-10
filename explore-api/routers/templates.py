"""Template endpoints: list, detail, preview."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from services.template_parser import parse_skill_md, scan_templates, render_preview

router = APIRouter(tags=["templates"])


@router.get("/api/templates")
async def list_templates() -> list[dict]:
    """GET /api/templates — list all available templates (catalog)."""
    return scan_templates()


@router.get("/api/templates/{template_id}")
async def get_template(template_id: str) -> dict:
    """GET /api/templates/{template_id} — get template details.

    template_id is the directory name under agenthub-templates."""
    import os
    templates_dir = os.path.join(
        os.path.expanduser("~/.hermes"), "skills", "agenthub-templates", template_id
    )
    skill_md = os.path.join(templates_dir, "SKILL.md")

    parsed = parse_skill_md(skill_md)
    if parsed is None:
        # Check if file exists but has YAML error vs file not found
        if os.path.isfile(skill_md):
            raise HTTPException(
                status_code=500,
                detail=f"Template '{template_id}' has a YAML parsing error in SKILL.md",
            )
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")

    return {
        "id": template_id,
        "name": parsed["name"],
        "version": parsed["version"],
        "description": parsed["description"],
        "params": parsed["params"],
        "hermesConfig": parsed["hermes_config"],
        "body": parsed["body"],
    }


@router.get("/api/templates/{template_id}/preview")
async def preview_template(template_id: str) -> dict:
    """GET /api/templates/{template_id}/preview — preview with default param values.

    Renders the prompt replacing {{param_name}} with defaults from the template."""
    import os
    templates_dir = os.path.join(
        os.path.expanduser("~/.hermes"), "skills", "agenthub-templates", template_id
    )
    skill_md = os.path.join(templates_dir, "SKILL.md")

    # Parse to get params and defaults
    parsed = parse_skill_md(skill_md)
    if parsed is None:
        # Check if file exists but has YAML error vs file not found
        if os.path.isfile(skill_md):
            raise HTTPException(
                status_code=500,
                detail=f"Template '{template_id}' has a YAML parsing error in SKILL.md",
            )
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")

    rendered = render_preview(skill_md)

    return {
        "template_id": template_id,
        "prompt": rendered,
        "config": {
            "params": parsed["params"],
            "hermesConfig": parsed["hermes_config"],
        },
    }
