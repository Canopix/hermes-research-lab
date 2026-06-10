import yaml
from pathlib import Path
from typing import Optional

from services.hermes_reader import get_hermes_dir, read_file


class TemplateService:
    @staticmethod
    def _parse_frontmatter(content: str) -> Optional[dict]:
        if not content.startswith("---"):
            return None
        parts = content.split("---", 2)
        if len(parts) < 3:
            return None
        return yaml.safe_load(parts[1])

    @classmethod
    def list_templates(cls) -> list[dict]:
        hermes_dir = get_hermes_dir()
        skills_dir = hermes_dir / "skills"
        if not skills_dir.exists():
            return []

        templates = []
        for skill_dir in sorted(skills_dir.iterdir()):
            skill_file = skill_dir / "SKILL.md"
            if not skill_file.exists():
                continue

            content = read_file(skill_file)
            if not content:
                continue

            meta = cls._parse_frontmatter(content)
            if not meta or meta.get("category") != "agenthub-template":
                continue

            templates.append({
                "id": skill_dir.name,
                "name": meta.get("name", skill_dir.name),
                "description": meta.get("description", ""),
                "params": meta.get("params", []),
                "tags": meta.get("tags", []),
            })

        return templates

    @classmethod
    def get_template(cls, template_id: str) -> Optional[dict]:
        templates = cls.list_templates()
        for t in templates:
            if t["id"] == template_id:
                return t
        return None

    @classmethod
    def preview(cls, template_id: str, params: dict) -> Optional[dict]:
        hermes_dir = get_hermes_dir()
        skills_dir = (hermes_dir / "skills").resolve()
        skill_dir = (skills_dir / template_id).resolve()
        # Guard against path traversal in template_id (e.g. "../../etc").
        if skills_dir not in skill_dir.parents:
            return None
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.exists():
            return None

        content = read_file(skill_file)
        if not content:
            return None

        # Extract markdown body (after frontmatter)
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                body = parts[2].strip()
            else:
                body = content
        else:
            body = content

        # Simple parameter substitution
        rendered = body
        for key, value in params.items():
            rendered = rendered.replace(f"{{{key}}}", str(value))

        return {
            "template_id": template_id,
            "rendered_prompt": rendered,
        }
