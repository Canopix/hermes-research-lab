"""Parse template directories: soul.md + params.yaml + hermes.yaml."""

from __future__ import annotations

import os
import re
from pathlib import Path

import yaml


TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "templates")

# Icon map: derive icon from template name/keywords
ICON_MAP = {
    "morning": "☀️",
    "brief": "☀️",
    "research": "🔬",
    "monitor": "📦",
    "watch": "👀",
    "paper": "📜",
    "summar": "📊",
    "competitor": "🎮",
    "ai": "🤖",
    "github": "🐙",
    "blog": "📝",
    "alert": "🚨",
    "social": "💬",
    "default": "📦",
}


def _derive_icon(name: str) -> str:
    lower = name.lower()
    for keyword, icon in ICON_MAP.items():
        if keyword in lower:
            return icon
    return ICON_MAP["default"]


def load_soul(soul_path: str) -> str | None:
    """Read soul.md — the prompt body with {{placeholders}}."""
    path = Path(soul_path)
    if not path.is_file():
        return None
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return None


def load_params(params_path: str) -> list[dict]:
    """Read params.yaml — list of parameter definitions."""
    path = Path(params_path)
    if not path.is_file():
        return []
    try:
        content = path.read_text(encoding="utf-8")
        data = yaml.safe_load(content)
        if isinstance(data, list):
            return data
        return []
    except (yaml.YAMLError, OSError):
        return []


def load_hermes_config(hermes_path: str) -> dict:
    """Read hermes.yaml — technical config (model, toolsets, deliver, etc.)."""
    path = Path(hermes_path)
    if not path.is_file():
        return {}
    try:
        content = path.read_text(encoding="utf-8")
        data = yaml.safe_load(content)
        if isinstance(data, dict):
            return data
        return {}
    except (yaml.YAMLError, OSError):
        return {}


def scan_templates(templates_dir: str | None = None) -> list[dict]:
    """Scan the project templates/ directory for template folders.

    Each directory must contain at least a soul.md to be considered a template.
    Returns a sorted list of template summaries.
    """
    if templates_dir is None:
        templates_dir = TEMPLATES_DIR

    result = []
    base = Path(templates_dir)
    if not base.is_dir():
        return result

    for entry in sorted(base.iterdir()):
        if not entry.is_dir():
            continue

        template_id = entry.name
        soul_path = entry / "soul.md"

        if not soul_path.is_file():
            continue

        soul = load_soul(str(soul_path))
        if soul is None:
            continue

        params = load_params(str(entry / "params.yaml"))
        hermes_config = load_hermes_config(str(entry / "hermes.yaml"))

        # Extract a short description from the first line of soul.md
        first_line = soul.strip().split("\n")[0] if soul.strip() else ""
        description = first_line.lstrip("#").strip() if first_line else template_id

        result.append({
            "id": template_id,
            "name": template_id,
            "description": description,
            "icon": _derive_icon(template_id),
            "params": params,
            "hermesConfig": hermes_config,
        })

    return sorted(result, key=lambda t: t["name"])


def get_template(template_id: str, templates_dir: str | None = None) -> dict | None:
    """Get full template data by ID."""
    if templates_dir is None:
        templates_dir = TEMPLATES_DIR

    base = Path(templates_dir) / template_id
    soul_path = base / "soul.md"

    if not soul_path.is_file():
        return None

    soul = load_soul(str(soul_path))
    if soul is None:
        return None

    params = load_params(str(base / "params.yaml"))
    hermes_config = load_hermes_config(str(base / "hermes.yaml"))

    first_line = soul.strip().split("\n")[0] if soul.strip() else ""
    description = first_line.lstrip("#").strip() if first_line else template_id

    return {
        "id": template_id,
        "name": template_id,
        "description": description,
        "icon": _derive_icon(template_id),
        "params": params,
        "hermesConfig": hermes_config,
        "body": soul,
    }


def render_preview(template_id: str, config: dict | None = None, templates_dir: str | None = None) -> str:
    """Render the soul.md replacing {{param_name}} with values.

    Falls back to parameter defaults for any missing keys.
    """
    if templates_dir is None:
        templates_dir = TEMPLATES_DIR

    base = Path(templates_dir) / template_id
    soul_path = base / "soul.md"

    soul = load_soul(str(soul_path))
    if soul is None:
        return ""

    # Load defaults from params.yaml
    params = load_params(str(base / "params.yaml"))
    defaults = {p["name"]: p.get("default", "") for p in params if isinstance(p, dict)}

    # Merge: user config overrides defaults
    if config is None:
        config = {}
    values = {**defaults, **config}

    # Replace {{param_name}} placeholders
    body = soul
    for name, value in values.items():
        body = body.replace("{{" + name + "}}", str(value) if value is not None else "")

    return body
