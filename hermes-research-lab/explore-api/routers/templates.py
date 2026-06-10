from typing import Any
from fastapi import APIRouter, HTTPException, Request

from services.template_service import TemplateService

router = APIRouter()


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
