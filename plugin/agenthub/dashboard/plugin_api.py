from pathlib import Path
from fastapi import APIRouter
import yaml

router = APIRouter()

TEMPLATES_DIR = Path(__file__).parent / "templates"


def _parse_template(template_id: str) -> dict | None:
    skill_path = TEMPLATES_DIR / template_id / "SKILL.md"
    if not skill_path.exists():
        return None
    text = skill_path.read_text(encoding="utf-8")
    parts = text.split("---")
    if len(parts) < 3:
        return None
    try:
        meta = yaml.safe_load(parts[1])
    except yaml.YAMLError:
        return None
    if not isinstance(meta, dict):
        return None
    return {
        "id": template_id,
        "name": meta.get("name", template_id),
        "description": meta.get("description", ""),
        "tags": meta.get("tags", []),
        "params": meta.get("params", []),
    }


@router.get("/templates")
def list_templates():
    if not TEMPLATES_DIR.is_dir():
        return []
    results = []
    for child in sorted(TEMPLATES_DIR.iterdir()):
        if child.is_dir():
            tpl = _parse_template(child.name)
            if tpl:
                results.append(tpl)
    return results


@router.get("/health")
def health():
    return {"ok": True}
