from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import yaml
import subprocess
import os
import json

router = APIRouter()

TEMPLATES_DIR = Path(__file__).parent / "templates"

# ── Known Hermes toolsets ────────────────────────────────────────────────
KNOWN_TOOLSETS: list[dict] = [
    {"id": "web", "name": "Web", "description": "Fetch and read web pages, follow links, extract content", "category": "research"},
    {"id": "search", "name": "Search", "description": "Web search via SearXNG or other backends", "category": "research"},
    {"id": "terminal", "name": "Terminal", "description": "Execute shell commands on the local system", "category": "development"},
    {"id": "file", "name": "File", "description": "Read, write, and manage local files", "category": "development"},
    {"id": "browser", "name": "Browser", "description": "Interact with a headless browser (Playwright) for scraping and automation", "category": "research"},
    {"id": "vision", "name": "Vision", "description": "Analyze images and screenshots using multimodal models", "category": "media"},
    {"id": "image_gen", "name": "Image Generation", "description": "Generate images via DALL-E, Flux, or Stable Diffusion", "category": "media"},
    {"id": "tts", "name": "Text-to-Speech", "description": "Convert text to speech audio via various TTS providers", "category": "media"},
    {"id": "skills", "name": "Skills", "description": "Load and use Hermes skills at runtime", "category": "agent"},
    {"id": "memory", "name": "Memory", "description": "Read and write persistent memory entries across sessions", "category": "agent"},
    {"id": "session_search", "name": "Session Search", "description": "Full-text search across past conversation sessions", "category": "agent"},
    {"id": "delegation", "name": "Delegation", "description": "Delegate tasks to sub-agents or child sessions", "category": "agent"},
    {"id": "cronjob", "name": "Cron Jobs", "description": "Schedule and manage recurring cron jobs", "category": "automation"},
    {"id": "todo", "name": "Todo", "description": "Manage a persistent todo/task list", "category": "automation"},
    {"id": "code_execution", "name": "Code Execution", "description": "Execute Python/JS code snippets in a sandboxed environment", "category": "development"},
    {"id": "homeassistant", "name": "Home Assistant", "description": "Control smart home devices via Home Assistant API", "category": "integration"},
    {"id": "discord", "name": "Discord", "description": "Interact with Discord channels and messages", "category": "integration"},
    {"id": "spotify", "name": "Spotify", "description": "Control Spotify playback and manage playlists", "category": "integration"},
    {"id": "x_search", "name": "X (Twitter) Search", "description": "Search and read posts from X/Twitter", "category": "research"},
    {"id": "kanban", "name": "Kanban", "description": "Manage kanban board tasks and workflows", "category": "automation"},
]

# ── Template skill/toolset recommendations ───────────────────────────────
TEMPLATE_SKILL_RECOMMENDATIONS: dict[str, list[str]] = {
    "ai-researcher": ["web", "arxiv"],
    "ai-news-digest": ["web", "blogwatcher"],
    "paper-summarizer": ["web", "arxiv"],
    "competitor-watcher": ["web", "browser"],
    "repo-scout": ["terminal", "web"],
    "repo-monitor": ["terminal", "web"],
    "backlog-triage": ["terminal", "web"],
    "docs-drift": ["terminal", "web"],
    "dep-audit": ["terminal"],
    "uptime-monitor": ["web", "terminal"],
    "security-audit": ["terminal", "web"],
    "content-pipeline": ["web", "terminal"],
}

TEMPLATE_TOOLSET_RECOMMENDATIONS: dict[str, list[str]] = {
    "ai-researcher": ["web", "search", "tts"],
    "ai-news-digest": ["web", "search"],
    "paper-summarizer": ["web", "search"],
    "competitor-watcher": ["web", "browser", "search"],
    "repo-scout": ["terminal", "web", "search"],
    "repo-monitor": ["terminal", "web"],
    "backlog-triage": ["terminal", "web", "search"],
    "docs-drift": ["terminal", "web"],
    "dep-audit": ["terminal"],
    "uptime-monitor": ["web", "terminal"],
    "security-audit": ["terminal", "web", "search"],
    "content-pipeline": ["web", "terminal", "search"],
}

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
        "recommendedSkills": TEMPLATE_SKILL_RECOMMENDATIONS.get(template_id, []),
        "recommendedToolsets": TEMPLATE_TOOLSET_RECOMMENDATIONS.get(template_id, []),
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


# ── GET /providers ───────────────────────────────────────────────────────

def _load_config() -> dict:
    """Load hermes config.yaml, returning empty dict on error."""
    hermes_home = Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))
    config_path = hermes_home / "config.yaml"
    if not config_path.exists():
        return {}
    try:
        return yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    except (yaml.YAMLError, OSError):
        return {}


@router.get("/providers")
def list_providers():
    """Read config.yaml and return configured providers + default model."""
    config = _load_config()
    model_section = config.get("model", {})
    providers_raw = config.get("providers", {})
    fallback = config.get("fallback_providers", [])

    # Build the default model info
    default_model = {
        "provider": model_section.get("provider", ""),
        "model": model_section.get("model", model_section.get("default", "")),
        "base_url": model_section.get("base_url", ""),
        "api_mode": model_section.get("api_mode", ""),
    }

    # Build configured providers list
    providers = []
    if isinstance(providers_raw, dict):
        for name, prov in providers_raw.items():
            if isinstance(prov, dict):
                providers.append({
                    "id": name,
                    "name": prov.get("name", name),
                    "provider": prov.get("provider", ""),
                    "base_url": prov.get("base_url", ""),
                    "models": prov.get("models", []),
                })
            elif isinstance(prov, str):
                providers.append({"id": name, "name": name, "provider": prov})

    # Add fallback providers
    fallback_list = []
    for fb in fallback:
        if isinstance(fb, str):
            fallback_list.append(fb)
        elif isinstance(fb, dict):
            fallback_list.append(fb.get("name", str(fb)))

    return {
        "default_model": default_model,
        "providers": providers,
        "fallback_providers": fallback_list,
    }


# ── GET /skills ──────────────────────────────────────────────────────────

def _parse_skill_md(path: Path) -> dict | None:
    """Parse a SKILL.md file and return {name, description, category} from frontmatter."""
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return None
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
        "name": meta.get("name", path.parent.name),
        "description": meta.get("description", ""),
        "category": path.parent.parent.name if path.parent.parent else "uncategorized",
    }


@router.get("/skills")
def list_skills():
    """Scan skill directories for SKILL.md files and return parsed metadata."""
    hermes_home = Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))
    skills = []
    seen: set[str] = set()

    # Scan locations: ~/.hermes/skills/ and ~/.hermes/profiles/*/skills/
    search_dirs: list[Path] = []
    global_skills = hermes_home / "skills"
    if global_skills.is_dir():
        search_dirs.append(global_skills)
    profiles_dir = hermes_home / "profiles"
    if profiles_dir.is_dir():
        for profile in profiles_dir.iterdir():
            if profile.is_dir():
                prof_skills = profile / "skills"
                if prof_skills.is_dir():
                    search_dirs.append(prof_skills)

    for base_dir in search_dirs:
        for skill_md in sorted(base_dir.rglob("SKILL.md")):
            # Skip .archive directories
            if ".archive" in skill_md.parts:
                continue
            parsed = _parse_skill_md(skill_md)
            if parsed is None:
                continue
            # Deduplicate by name
            key = parsed["name"]
            if key in seen:
                continue
            seen.add(key)
            # Derive category from path (e.g. skills/research/my-skill → research)
            path_parts = skill_md.relative_to(base_dir).parts
            if len(path_parts) > 1:
                parsed["category"] = path_parts[0]
            skills.append(parsed)

    return skills


# ── GET /toolsets ────────────────────────────────────────────────────────

@router.get("/toolsets")
def list_toolsets():
    """Return the known Hermes toolsets with descriptions and categories."""
    return KNOWN_TOOLSETS


# ── GET /channels ────────────────────────────────────────────────────────

@router.get("/channels")
def list_channels():
    """Read config.yaml gateway.platforms to detect connected delivery channels."""
    config = _load_config()
    gateway = config.get("gateway", {})
    platforms = gateway.get("platforms", {})

    channels = []

    # Always include local delivery
    channels.append({
        "id": "local",
        "name": "Local",
        "type": "local",
        "connected": True,
        "description": "Deliver output to local stdout / agent terminal",
    })

    # Detect configured platforms
    platform_type_map = {
        "telegram": "telegram",
        "discord": "discord",
        "slack": "slack",
        "whatsapp": "whatsapp",
        "signal": "signal",
        "microsoft_teams": "teams",
        "matrix": "matrix",
    }

    if isinstance(platforms, dict):
        for name, platform_cfg in platforms.items():
            if isinstance(platform_cfg, dict):
                enabled = platform_cfg.get("enabled", True)
                channels.append({
                    "id": name,
                    "name": name.replace("_", " ").title(),
                    "type": platform_type_map.get(name, name),
                    "connected": enabled,
                    "description": f"Deliver via {name.replace('_', ' ').title()}",
                    "config": {
                        k: v for k, v in platform_cfg.items()
                        if k not in ("api_key", "token", "secret", "webhook_secret")
                    },
                })
            elif isinstance(platform_cfg, bool):
                channels.append({
                    "id": name,
                    "name": name.replace("_", " ").title(),
                    "type": platform_type_map.get(name, name),
                    "connected": platform_cfg,
                    "description": f"Deliver via {name.replace('_', ' ').title()}",
                })

    # Add a catch-all "all" option
    channels.append({
        "id": "all",
        "name": "All Channels",
        "type": "all",
        "connected": True,
        "description": "Deliver to all connected platforms simultaneously",
    })

    return channels


# ── Existing endpoints below ─────────────────────────────────────────────

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
    skills: list[str] = []
    enabled_toolsets: list[str] = []
    model_provider: str | None = None
    model_name: str | None = None


@router.post("/create-agent")
def create_agent(req: CreateAgentRequest):
    hermes_home = Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))
    profile_name = f"agent-{req.template_id}"
    profile_dir = hermes_home / "profiles" / profile_name
    profile_dir.mkdir(parents=True, exist_ok=True)

    tpl = _parse_template(req.template_id)
    if tpl is None:
        raise HTTPException(status_code=404, detail="Template not found")

    # Render the SKILL.md body with user params
    body = _read_skill_body(req.template_id)
    rendered = body or ""
    for k, v in req.config.items():
        rendered = rendered.replace("{" + k + "}", str(v))

    # Build SOUL.md from the rendered prompt (not just metadata)
    soul_lines = [
        f"# {req.name}",
        "",
        f"Based on template: {tpl['name']}",
        f"Description: {tpl['description']}",
        "",
        "## Parameters",
    ]
    for p in tpl.get("params", []):
        val = req.config.get(p["name"], p.get("default", ""))
        soul_lines.append(f"- {p['name']}: {val}")

    soul_lines.extend([
        "",
        "---",
        "",
        "## Instructions",
        "",
        rendered,
    ])
    (profile_dir / "SOUL.md").write_text("\n".join(soul_lines), encoding="utf-8")

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

    # Build hermes cron create command with --skill flags for each skill
    cmd = [
        "hermes", "cron", "create", schedule, rendered,
        "--name", agent_name,
        "--deliver", deliver,
    ]
    # Add template skill itself
    cmd.extend(["--skill", req.template_id])
    # Add additional user-selected skills
    for skill in req.skills:
        if skill != req.template_id:  # avoid duplicate
            cmd.extend(["--skill", skill])

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

    # Save agenthub-metadata.json with toolsets, model override, etc.
    metadata = {
        "template_id": req.template_id,
        "agent_name": agent_name,
        "skills": [req.template_id] + [s for s in req.skills if s != req.template_id],
        "enabled_toolsets": req.enabled_toolsets,
        "model_override": {
            "provider": req.model_provider,
            "model": req.model_name,
        } if req.model_provider or req.model_name else None,
        "schedule": schedule,
        "deliver": deliver,
        "config": req.config,
    }
    (profile_dir / "agenthub-metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )

    if result.returncode != 0:
        return {
            "profile": profile_name,
            "profile_created": True,
            "job_created": False,
            "error": result.stderr.strip(),
            "metadata": metadata,
        }

    return {
        "profile": profile_name,
        "profile_created": True,
        "job_created": True,
        "metadata": metadata,
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
