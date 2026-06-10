"""Parse SKILL.md frontmatter YAML for template metadata."""

from __future__ import annotations

import os
import re
from pathlib import Path

import yaml


# Icon map: derive icon from skill name keywords
ICON_MAP = {
    "research": "\U0001f52c",
    "monitor": "\U0001f4e6",
    "watch": "\U0001f440",
    "paper": "\U0001f4dc",
    "summar": "\U0001f4d0",
    "competitor": "\U0001f3ae",
    "ai": "\U0001f916",
    "github": "\U0001f419",
    "blog": "\U0001f4dd",
    "default": "\U0001f4e9",
}


def _derive_icon(name: str) -> str:
    """Derive an emoji icon from the skill name."""
    lower = name.lower()
    for keyword, icon in ICON_MAP.items():
        if keyword in lower:
            return icon
    return ICON_MAP["default"]


def parse_skill_md(skill_path):
    """Parse a SKILL.md file and extract frontmatter YAML + metadata."""
    path = Path(skill_path)
    if not path.is_file():
        return None

    try:
        content = path.read_text(encoding="utf-8")
    except OSError:
        return None

    # Extract YAML frontmatter between --- delimiters
    fm_pattern = re.compile(r'^---\n(.*?)\n---\n(.*)', re.DOTALL)
    match = fm_pattern.match(content)
    if not match:
        return {
            "name": path.parent.name,
            "version": "0.0.0",
            "description": "",
            "metadata": {},
            "params": [],
            "hermes_config": {},
            "body": content,
        }

    try:
        frontmatter = yaml.safe_load(match.group(1))
    except yaml.YAMLError:
        return None

    if not isinstance(frontmatter, dict):
        return None

    body = match.group(2)

    # Params are at top level of frontmatter (per spec)
    params = frontmatter.get("params", [])
    if not isinstance(params, list):
        params = []

    # hermes_config at top level
    hermes_config = frontmatter.get("hermes_config", {})
    if not isinstance(hermes_config, dict):
        hermes_config = {}

    return {
        "name": frontmatter.get("name", path.parent.name),
        "version": frontmatter.get("version", "0.0.0"),
        "description": frontmatter.get("description", ""),
        "metadata": frontmatter,
        "params": params,
        "hermes_config": hermes_config,
        "body": body,
    }


def scan_templates(hermes_home=None):
    """Scan ~/.hermes/skills/ for SKILL.md files with category: agenthub-template.

    Walks the skills directory tree, parses each SKILL.md, and returns only
    those whose frontmatter contains category == 'agenthub-template'.
    """
    if hermes_home is None:
        hermes_home = os.path.join(os.path.expanduser("~/.hermes"), "skills")

    result = []
    skills_path = Path(hermes_home)
    if not skills_path.is_dir():
        return result

    for skill_md in skills_path.rglob("SKILL.md"):
        parsed = parse_skill_md(skill_md)
        if parsed is None:
            continue

        # Check category in frontmatter
        metadata = parsed.get("metadata", {})
        if not isinstance(metadata, dict):
            continue
        if metadata.get("category") != "agenthub-template":
            continue

        template_id = skill_md.parent.name
        result.append({
            "id": template_id,
            "name": parsed["name"],
            "description": parsed["description"],
            "icon": _derive_icon(parsed["name"]),
            "params": parsed["params"],
            "hermesConfig": parsed["hermes_config"],
        })

    return sorted(result, key=lambda t: t["name"])


def render_preview(skill_path, params=None):
    """Render the SKILL.md body replacing {{param_name}} with values."""
    path = Path(skill_path)
    if not path.is_file():
        return ""

    try:
        content = path.read_text(encoding="utf-8")
    except OSError:
        return ""

    fm_pattern = re.compile(r'^---\n(.*?)\n---\n(.*)', re.DOTALL)
    match = fm_pattern.match(content)
    if not match:
        return content

    try:
        frontmatter = yaml.safe_load(match.group(1))
    except yaml.YAMLError:
        return match.group(2)

    body = match.group(2)
    if not isinstance(frontmatter, dict):
        return body

    # Build a values map: explicit params > defaults from frontmatter > empty
    param_defs = frontmatter.get("params", [])
    if not isinstance(param_defs, list):
        param_defs = []

    defaults = {}
    for pdef in param_defs:
        if isinstance(pdef, dict):
            pname = pdef.get("name", "")
            if pname:
                defaults[pname] = pdef.get("default", "")

    # Merge explicit params over defaults
    if params is None:
        params = {}
    values = {**defaults, **params}

    # Replace {{param_name}} placeholders
    for name, value in values.items():
        body = body.replace("{{" + name + "}}", str(value) if value else "")

    return body
