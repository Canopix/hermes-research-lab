"""Profile endpoints: list, detail, memory, config."""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config import HERMES_HOME


def _validate_id(id_str: str) -> str:
    """Validate that an ID contains only safe characters."""
    if not re.match(r'^[a-zA-Z0-9_-]+$', id_str):
        raise HTTPException(status_code=400, detail=f"Invalid ID format: {id_str}")
    return id_str


from services.profile_provision import (
    ProfileProvisionError,
    delete_agent_profile,
    is_agenthub_profile,
    provision_agent_profile,
)

router = APIRouter(tags=["profiles"])


class CreateProfileRequest(BaseModel):
    name: str
    template: str
    config: dict[str, Any] = Field(default_factory=dict)
    description: str | None = None


@router.post("/api/system/profiles")
async def create_profile(body: CreateProfileRequest) -> dict:
    """POST /api/system/profiles — create an AgentHub agent profile via Hermes CLI."""
    try:
        profile_name = await provision_agent_profile(
            template_id=body.template,
            agent_name=body.name,
            config=body.config,
            description=body.description,
        )
    except ProfileProvisionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    profile_dir = _profiles_dir() / profile_name
    return {
        "name": profile_name,
        "description": body.description or body.name,
        "skills": _list_skills_for_profile(profile_name),
        "soul": _read_text(profile_dir / "SOUL.md"),
    }


def _profiles_dir() -> Path:
    """Return the profiles directory path."""
    return Path(HERMES_HOME) / "profiles"


def _list_profile_names() -> list[str]:
    """List profile directory names."""
    d = _profiles_dir()
    if not d.is_dir():
        return []
    return sorted([p.name for p in d.iterdir() if p.is_dir()])


def _load_yaml(path: Path) -> dict | None:
    """Load a YAML file, return None on error."""
    if not path.is_file():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    except (yaml.YAMLError, OSError):
        return None


def _read_text(path: Path) -> str | None:
    """Read a text file, return None on error."""
    if not path.is_file():
        return None
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return None


def _list_skills_for_profile(profile_name: str) -> list[str]:
    """List installed skill names for a profile."""
    skills_dir = Path(HERMES_HOME) / "profiles" / profile_name / "skills"
    if not skills_dir.is_dir():
        return []
    return sorted([p.name for p in skills_dir.iterdir() if p.is_dir()])


@router.get("/api/system/profiles")
async def list_profiles() -> list[dict]:
    """GET /api/system/profiles — list all profiles with basic info."""
    profile_names = _list_profile_names()
    result = []
    for name in profile_names:
        profile_dir = _profiles_dir() / name
        config = _load_yaml(profile_dir / "config.yaml")
        description = ""
        if config and isinstance(config, dict):
            description = config.get("description", "") or config.get("system", "") or ""

        skills = _list_skills_for_profile(name)
        result.append({
            "name": name,
            "description": description,
            "skills": skills,
        })
    return result


@router.get("/api/system/profiles/{name}")
async def get_profile(name: str) -> dict:
    """GET /api/system/profiles/{name} — detailed profile info."""
    _validate_id(name)
    profile_dir = _profiles_dir() / name
    if not profile_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Profile '{name}' not found")

    config = _load_yaml(profile_dir / "config.yaml")
    soul = _read_text(profile_dir / "SOUL.md")
    memory = _read_text(profile_dir / "MEMORY.md")
    user = _read_text(profile_dir / "USER.md")
    skills = _list_skills_for_profile(name)

    return {
        "name": name,
        "config": config,
        "soul": soul,
        "memory": memory,
        "user": user,
        "skills": skills,
    }


@router.get("/api/system/profiles/{name}/memory")
async def get_profile_memory(name: str) -> dict:
    """GET /api/system/profiles/{name}/memory — raw MEMORY.md + USER.md content."""
    _validate_id(name)
    profile_dir = _profiles_dir() / name
    if not profile_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Profile '{name}' not found")

    memory = _read_text(profile_dir / "MEMORY.md")
    user = _read_text(profile_dir / "USER.md")

    return {
        "name": name,
        "memory": memory or "",
        "user": user or "",
    }


@router.get("/api/system/profiles/{name}/config")
async def get_profile_config(name: str) -> dict:
    """GET /api/system/profiles/{name}/config — parsed config.yaml."""
    _validate_id(name)
    profile_dir = _profiles_dir() / name
    if not profile_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Profile '{name}' not found")

    config = _load_yaml(profile_dir / "config.yaml")
    if config is None:
        raise HTTPException(status_code=404, detail=f"No config.yaml found for profile '{name}'")

    return {
        "name": name,
        "config": config,
    }


@router.delete("/api/system/profiles/{name}")
async def delete_profile(name: str) -> dict:
    """DELETE /api/system/profiles/{name} — remove an AgentHub profile via Hermes CLI."""
    _validate_id(name)
    if not is_agenthub_profile(name):
        raise HTTPException(
            status_code=403,
            detail=(
                f"Profile '{name}' no fue creado por AgentHub. "
                "Elimínalo con: hermes profile delete " + name
            ),
        )

    from services.profile_provision import profile_exists

    if not profile_exists(name):
        raise HTTPException(status_code=404, detail=f"Profile '{name}' not found")

    try:
        await delete_agent_profile(name)
    except ProfileProvisionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    return {"status": "deleted", "name": name}
