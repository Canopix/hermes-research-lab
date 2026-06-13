from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import yaml
import subprocess
import os

router = APIRouter()

TEMPLATES_DIR = Path(__file__).parent / "templates"

# ── Category system ──────────────────────────────────────────────────────
CATEGORY_MAP: dict[str, str] = {
    "ai-researcher": "research-intelligence",
    "paper-summarizer": "research-intelligence",
    "competitor-watcher": "research-intelligence",
    "repo-scout": "research-intelligence",
    "ai-news-digest": "research-intelligence",
    "morning-briefing": "research-intelligence",
    "backlog-triage": "development-workflow",
    "docs-drift": "development-workflow",
    "dep-audit": "development-workflow",
    "repo-monitor": "devops-monitoring",
    "uptime-monitor": "devops-monitoring",
    "security-audit": "multi-skill-workflows",
    "content-pipeline": "multi-skill-workflows",
}

CATEGORY_ORDER: list[str] = [
    "research-intelligence",
    "development-workflow",
    "devops-monitoring",
    "multi-skill-workflows",
]

CATEGORY_LABELS: dict[str, str] = {
    "research-intelligence": "Research & Intelligence",
    "development-workflow": "Development Workflow",
    "devops-monitoring": "DevOps & Monitoring",
    "multi-skill-workflows": "Multi-Skill Workflows",
    "business-operations": "Business Operations",
    "github-automations": "GitHub Automations",
}


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

    category = CATEGORY_MAP.get(template_id, "other")

    return {
        "id": template_id,
        "name": meta.get("name", template_id),
        "description": meta.get("description", ""),
        "tags": meta.get("tags", []),
        "category": category,
        "categoryLabel": CATEGORY_LABELS.get(category, category),
        "params": meta.get("params", []),
    }


def _read_skill_body(template_id: str) -> str | None:
    skill_path = TEMPLATES_DIR / template_id / "SKILL.md"
    if not skill_path.exists():
        return None
    text = skill_path.read_text(encoding="utf-8")
    parts = text.split("---")
    if len(parts) < 3:
        return None
    return "---".join(parts[2:]).strip()


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
    # Sort by category order, then by name within category
    def _cat_sort_key(t: dict) -> tuple[int, str]:
        cat = t.get("category", "zzz")
        try:
            idx = CATEGORY_ORDER.index(cat)
        except ValueError:
            idx = len(CATEGORY_ORDER)
        return (idx, t["name"])
    return sorted(results, key=_cat_sort_key)


@router.get("/templates/{template_id}")
def get_template(template_id: str):
    tpl = _parse_template(template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tpl


class PreviewRequest(BaseModel):
    template_id: str
    config: dict[str, str] = {}


@router.post("/preview")
def preview(req: PreviewRequest):
    body = _read_skill_body(req.template_id)
    if body is None:
        raise HTTPException(status_code=404, detail="Template not found")
    rendered = body
    for k, v in req.config.items():
        rendered = rendered.replace("{" + k + "}", str(v))
    return {"rendered_prompt": rendered}


class CreateAgentRequest(BaseModel):
    template_id: str
    name: str
    config: dict[str, str] = {}
    schedule: str | None = None
    deliver: str | None = None


@router.post("/create-agent")
def create_agent(req: CreateAgentRequest):
    hermes_home = Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))
    profile_name = f"agent-{req.template_id}"
    profile_dir = hermes_home / "profiles" / profile_name
    profile_dir.mkdir(parents=True, exist_ok=True)

    tpl = _parse_template(req.template_id)
    if tpl is None:
        raise HTTPException(status_code=404, detail="Template not found")

    soul_lines = [
        f"# {req.name}",
        f"",
        f"Based on template: {tpl['name']}",
        f"Description: {tpl['description']}",
        f"",
        f"## Parameters",
    ]
    for p in tpl.get("params", []):
        val = req.config.get(p["name"], p.get("default", ""))
        soul_lines.append(f"- {p['name']}: {val}")
    (profile_dir / "SOUL.md").write_text("\n".join(soul_lines), encoding="utf-8")

    body = _read_skill_body(req.template_id)
    rendered = body
    for k, v in req.config.items():
        rendered = rendered.replace("{" + k + "}", str(v))

    schedule = req.schedule
    if not schedule:
        freq = req.config.get("frequency", "")
        if freq == "Diario":
            schedule = "every 24h"
        elif freq == "Cada 12 horas":
            schedule = "every 12h"
        elif freq == "Semanal":
            schedule = "every 7d"
        else:
            schedule = "every 24h"

    agent_name = req.name or tpl["name"]
    deliver = req.deliver or "local"

    # PoC: create the cron job in the default profile so it's visible in the
    # Agents tab (`hermes cron list`). The dedicated profile + SOUL.md above are
    # kept as artifacts; wiring the job to run AS that profile (--profile, which
    # requires a real `hermes profile create`) and listing per-profile jobs is a
    # follow-up.
    cmd = [
        "hermes", "cron", "create", schedule, rendered,
        "--name", agent_name,
        "--skill", req.template_id,
        "--deliver", deliver,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

    if result.returncode != 0:
        return {
            "profile": profile_name,
            "profile_created": True,
            "job_created": False,
            "error": result.stderr.strip(),
        }

    return {
        "profile": profile_name,
        "profile_created": True,
        "job_created": True,
    }


@router.get("/jobs")
def list_jobs():
    try:
        result = subprocess.run(
            ["hermes", "cron", "list"],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            return {"raw": "", "error": result.stderr.strip()}
        return {"raw": result.stdout}
    except Exception as e:
        return {"raw": "", "error": str(e)}


@router.get("/health")
def health():
    return {"ok": True}