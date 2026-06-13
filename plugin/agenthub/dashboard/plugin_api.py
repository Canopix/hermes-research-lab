from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import re
import sys
import yaml
import subprocess
import os
import json
import urllib.request
import urllib.error
from datetime import datetime

_PLUGIN_DIR = Path(__file__).resolve().parent
if str(_PLUGIN_DIR) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_DIR))

from job_outputs import list_job_outputs

router = APIRouter()

TEMPLATES_DIR = Path(__file__).parent / "templates"
AGENT_PROFILE_PREFIX = "agent-"

# A template/agent id is a plain slug. Used to reject path-traversal payloads
# (e.g. "../../etc/foo") before they reach the filesystem.
_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
# A schedule is either a "every N{h,d,m}" expression or a 5-field cron line.
_EVERY_RE = re.compile(r"^every \d+[hdm]$")
_CRON_RE = re.compile(r"^[\d*/,\- ]+$")


def _is_valid_template_id(template_id: str) -> bool:
    """Reject path traversal: a template id must be a bare slug whose resolved
    SKILL.md actually lives directly under TEMPLATES_DIR."""
    if not _SLUG_RE.match(template_id):
        return False
    try:
        resolved = (TEMPLATES_DIR / template_id).resolve()
        return resolved.parent == TEMPLATES_DIR.resolve()
    except OSError:
        return False

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
    if not _is_valid_template_id(template_id):
        return None
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
    if not _is_valid_template_id(template_id):
        return None
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
    
    # Add the default provider first
    if default_model.get("provider"):
        providers.append({
            "id": "default",
            "name": default_model["provider"] + " (default)",
            "provider": default_model["provider"],
            "model": default_model.get("model", ""),
            "base_url": default_model.get("base_url", ""),
            "is_default": True,
            "models": [],
        })
    
    if isinstance(providers_raw, dict):
        for name, prov in providers_raw.items():
            if isinstance(prov, dict):
                providers.append({
                    "id": name,
                    "name": prov.get("name", name),
                    "provider": prov.get("provider", ""),
                    "model": prov.get("model", ""),
                    "base_url": prov.get("base_url", ""),
                    "is_default": False,
                    "models": prov.get("models", []),
                })
            elif isinstance(prov, str):
                providers.append({"id": name, "name": name, "provider": prov, "model": "", "is_default": False, "models": []})

    # Add fallback providers
    fallback_list = []
    for fb in fallback:
        if isinstance(fb, str):
            fallback_list.append(fb)
        elif isinstance(fb, dict):
            fallback_list.append(fb.get("name", str(fb)))

    return {
        "default_provider": default_model.get("provider", ""),
        "default_model": default_model.get("model", ""),
        "options": providers,
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
        # "discord": "discord",  # Desactivado temporalmente
        "slack": "slack",
        "whatsapp": "whatsapp",
        "signal": "signal",
        "microsoft_teams": "teams",
        "matrix": "matrix",
    }
    platform_features = {
        "telegram": {"supports_chat_id": True, "supports_thread_id": True},
        # "discord": {"supports_chat_id": True, "supports_thread_id": True},  # Desactivado temporalmente
        "slack": {"supports_chat_id": True, "supports_thread_id": False},
    }

    if isinstance(platforms, dict):
        for name, platform_cfg in platforms.items():
            ptype = platform_type_map.get(str(name), str(name))
            features = platform_features.get(str(ptype), {})
            if isinstance(platform_cfg, dict):
                enabled = platform_cfg.get("enabled", True)
                channels.append({
                    "id": name,
                    "name": name.replace("_", " ").title(),
                    "type": ptype,
                    "connected": enabled,
                    "description": f"Deliver via {name.replace('_', ' ').title()}",
                    "config": {
                        k: v for k, v in platform_cfg.items()
                        if k not in ("api_key", "token", "secret", "webhook_secret")
                    },
                    **features,
                })
            elif isinstance(platform_cfg, bool):
                channels.append({
                    "id": name,
                    "name": name.replace("_", " ").title(),
                    "type": ptype,
                    "connected": platform_cfg,
                    "description": f"Deliver via {name.replace('_', ' ').title()}",
                    **features,
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
    # Sanitize name for profile: lowercase slug, strip anything that isn't
    # [a-z0-9-] so "../" / "/" path-traversal payloads can't escape profiles/.
    safe_name = re.sub(r"-+", "-", re.sub(r"[^a-z0-9-]", "-", req.name.lower())).strip("-")
    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid agent name")
    profile_name = f"agent-{safe_name}"
    profiles_root = (hermes_home / "profiles").resolve()
    profile_dir = profiles_root / profile_name
    # Defence in depth: the resolved profile dir must sit directly under profiles/.
    if profile_dir.resolve().parent != profiles_root:
        raise HTTPException(status_code=400, detail="Invalid agent name")

    tpl = _parse_template(req.template_id)
    if tpl is None:
        raise HTTPException(status_code=404, detail="Template not found")

    # 1. Create profile with --clone (copies config.yaml, .env, SOUL.md from current)
    profile_created = False
    if not profile_dir.exists():
        create_cmd = ["hermes", "profile", "create", profile_name, "--clone"]
        result = subprocess.run(create_cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            return {"profile": profile_name, "profile_created": False,
                    "job_created": False, "error": f"Profile create failed: {result.stderr.strip()}"}
        profile_created = True

    # 2. Render the SKILL.md body with user params
    body = _read_skill_body(req.template_id)
    rendered = body or ""
    for k, v in req.config.items():
        rendered = rendered.replace("{" + k + "}", str(v))

    # 3. Write SOUL.md with the rendered prompt as instructions
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

    soul_lines.extend(["", "---", "", "## Instructions", "", rendered])
    (profile_dir / "SOUL.md").write_text("\n".join(soul_lines), encoding="utf-8")

    # 4. If user selected a specific model, write profile-level config.yaml
    if req.model_provider or req.model_name:
        profile_config = profile_dir / "config.yaml"
        model_block = {}
        if req.model_provider:
            model_block["provider"] = req.model_provider
        if req.model_name:
            model_block["default"] = req.model_name
        config_content = {"model": model_block}
        profile_config.write_text(yaml.dump(config_content, default_flow_style=False), encoding="utf-8")

    # 5. Resolve schedule
    schedule = req.schedule
    if not schedule:
        freq = req.config.get("frequency", "")
        schedule_map = {"Diario": "every 24h", "Cada 12 horas": "every 12h",
                        "Cada 6 horas": "every 6h", "Semanal": "every 7d"}
        schedule = schedule_map.get(freq, "every 24h")

    agent_name = req.name or tpl["name"]
    deliver = req.deliver or "local"

    # 6. Create cron job IN the new profile context using -p flag
    cmd = ["hermes", "-p", profile_name, "cron", "create", schedule, rendered,
           "--name", agent_name, "--deliver", deliver]
    # Add skills — only user-selected real skills, NOT the template_id
    # (templates render prompts; they are not executable skills)
    selected_skills = [s for s in req.skills if s]
    for skill in selected_skills:
        cmd.extend(["--skill", skill])
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    except subprocess.TimeoutExpired:
        return {"profile": profile_name, "profile_created": profile_created,
                "job_created": False, "error": "Hermes cron create timed out after 60s"}
    except FileNotFoundError:
        return {"profile": profile_name, "profile_created": profile_created,
                "job_created": False, "error": "Hermes CLI not found on PATH"}
    except Exception as exc:
        return {"profile": profile_name, "profile_created": profile_created,
                "job_created": False, "error": f"Failed to run hermes cron create: {exc}"}

    # 7. Save metadata
    metadata = {
        "template_id": req.template_id,
        "agent_name": agent_name,
        "profile": profile_name,
        "created_at": datetime.now().astimezone().isoformat(),
        "skills": selected_skills,
        "enabled_toolsets": req.enabled_toolsets,
        "model_override": {"provider": req.model_provider, "model": req.model_name}
        if req.model_provider or req.model_name else None,
        "schedule": schedule,
        "deliver": deliver,
        "config": req.config,
    }
    (profile_dir / "agenthub-metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8")

    if result.returncode != 0:
        return {"profile": profile_name, "profile_created": profile_created,
                "job_created": False, "error": result.stderr.strip(), "metadata": metadata}

    return {"profile": profile_name, "profile_created": profile_created,
            "job_created": True, "metadata": metadata}


def _parse_cron_list_output(text: str) -> list[dict]:
    """Parse `hermes cron list` CLI output into structured job dicts."""
    jobs: list[dict] = []
    current: dict | None = None

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped[0] in "┌└│⚠" or stripped.startswith("Scheduled Jobs"):
            continue

        job_match = re.match(r"^([a-f0-9]+)\s+\[(\w+)\]", stripped)
        if job_match:
            if current:
                jobs.append(current)
            current = {"id": job_match.group(1), "status": job_match.group(2)}
            continue

        if current and ":" in stripped:
            key, _, val = stripped.partition(":")
            field = key.strip().lower().replace(" ", "_")
            current[field] = val.strip()

    if current:
        jobs.append(current)

    return jobs


def _run_cron_list(profile: str | None = None) -> tuple[str, str, int]:
    cmd = ["hermes"]
    if profile:
        cmd.extend(["-p", profile])
    cmd.extend(["cron", "list"])
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    stderr = result.stderr.strip() if result.stderr else ""
    return result.stdout or "", stderr, result.returncode


def _hermes_home() -> Path:
    return Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))


def _hermes_api_get(path: str, params: dict | None = None) -> dict | list | None:
    """Query the Hermes API server (port 8642) for data."""
    port = 8642
    url = f"http://127.0.0.1:{port}{path}"
    if params:
        qs = "&".join(f"{k}={v}" for k, v in params.items() if v is not None)
        if qs:
            url += f"?{qs}"
    req = urllib.request.Request(url, headers={"X-API-Key": "agenthub-local"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, OSError, json.JSONDecodeError):
        return None


def _fetch_cron_run_history(profile: str, job_id: str, limit: int = 20) -> list[dict]:
    """Fetch cron job run sessions from the Hermes API server."""
    data = _hermes_api_get(f"/api/cron/jobs/{job_id}/runs", {"profile": profile, "limit": str(limit)})
    if data is None:
        return []
    runs = data.get("runs", []) if isinstance(data, dict) else []
    results: list[dict] = []
    for run in runs:
        started = run.get("started_at", "")
        if isinstance(started, (int, float)):
            from datetime import datetime as _dt
            started = _dt.fromtimestamp(started).isoformat() if started else ""
        ended = run.get("ended_at", "")
        if isinstance(ended, (int, float)):
            from datetime import datetime as _dt
            ended = _dt.fromtimestamp(ended).isoformat() if ended else ""
        title = run.get("title") or run.get("summary") or f"Cron run"
        excerpt = run.get("summary") or run.get("last_user_message", "")[:240]
        results.append({
            "id": run.get("id", ""),
            "job_id": job_id,
            "title": title,
            "excerpt": excerpt,
            "started_at": started,
            "ended_at": ended,
            "status": "completed" if ended else ("active" if run.get("is_active") else "completed"),
            "is_failed": bool(run.get("error")),
            "link_count": 0,
            "is_silent": False,
            "output": run.get("last_assistant_message") or excerpt,
            "profile": profile,
        })
    return results


def _is_agenthub_profile(name: str, profile_dir: Path) -> bool:
    if name.startswith(AGENT_PROFILE_PREFIX):
        return True
    return (profile_dir / "agenthub-metadata.json").is_file()


def _list_agenthub_profiles(hermes_home: Path) -> list[str]:
    profiles_dir = hermes_home / "profiles"
    if not profiles_dir.is_dir():
        return []
    names: list[str] = []
    for entry in sorted(profiles_dir.iterdir()):
        if entry.is_dir() and _is_agenthub_profile(entry.name, entry):
            names.append(entry.name)
    return names


def _load_profile_metadata(profile_dir: Path) -> dict:
    meta_path = profile_dir / "agenthub-metadata.json"
    if not meta_path.is_file():
        return {}
    try:
        data = json.loads(meta_path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


def _read_soul_header(profile_dir: Path) -> tuple[str | None, str | None]:
    soul_path = profile_dir / "SOUL.md"
    if not soul_path.is_file():
        return None, None
    try:
        text = soul_path.read_text(encoding="utf-8")
    except OSError:
        return None, None
    title = None
    description = None
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("# ") and not title:
            title = stripped[2:].strip()
            continue
        if title and not description and not stripped.startswith("#"):
            description = stripped
            break
    return title, description


def _profile_created_at(profile_dir: Path, meta: dict, jobs: list[dict]) -> str | None:
    if meta.get("created_at"):
        return str(meta["created_at"])
    created_values = [j.get("created_at") for j in jobs if j.get("created_at")]
    if created_values:
        return min(created_values)
    try:
        return datetime.fromtimestamp(profile_dir.stat().st_ctime).isoformat()
    except OSError:
        return None


def _load_profile_jobs(profile_dir: Path, profile: str, meta: dict) -> list[dict]:
    jobs_path = profile_dir / "cron" / "jobs.json"
    if jobs_path.is_file():
        try:
            data = json.loads(jobs_path.read_text(encoding="utf-8"))
            raw_jobs = data.get("jobs", []) if isinstance(data, dict) else []
            if isinstance(raw_jobs, list) and raw_jobs:
                return [_normalize_job_from_json(job, profile, meta) for job in raw_jobs]
        except (json.JSONDecodeError, OSError):
            pass

    stdout, stderr, code = _run_cron_list(profile)
    if code != 0:
        return []
    return [
        _normalize_job(job, profile=profile, source="agenthub", metadata=meta)
        for job in _parse_cron_list_output(stdout)
    ]


def _normalize_job(job: dict, *, profile: str | None, source: str, metadata: dict | None = None) -> dict:
    meta = metadata or {}
    name = job.get("name") or meta.get("agent_name") or job.get("id", "Agent")
    return {
        "id": job.get("id", ""),
        "name": name,
        "status": job.get("status", "unknown"),
        "schedule": job.get("schedule", ""),
        "repeat": job.get("repeat", ""),
        "next_run": job.get("next_run", ""),
        "deliver": job.get("deliver", ""),
        "last_run": job.get("last_run", ""),
        "last_status": job.get("last_status"),
        "profile": profile,
        "source": source,
        "template_id": meta.get("template_id"),
        "created_at": job.get("created_at"),
    }


def _normalize_job_from_json(job: dict, profile: str, meta: dict) -> dict:
    schedule = job.get("schedule_display")
    if not schedule and isinstance(job.get("schedule"), dict):
        schedule = job["schedule"].get("display") or ""
    status = "active"
    if job.get("paused_at"):
        status = "paused"
    elif job.get("enabled") is False:
        status = "disabled"
    elif job.get("state"):
        status = str(job["state"])
    return {
        "id": job.get("id", ""),
        "name": job.get("name") or meta.get("agent_name") or profile,
        "status": status,
        "schedule": schedule or "",
        "next_run": job.get("next_run_at", ""),
        "deliver": job.get("deliver", ""),
        "last_run": job.get("last_run_at", ""),
        "last_status": job.get("last_status"),
        "profile": profile,
        "source": "agenthub",
        "template_id": meta.get("template_id"),
        "created_at": job.get("created_at"),
    }


def _build_agent_summary(profile: str, hermes_home: Path, *, include_outputs: bool = False) -> dict:
    profile_dir = hermes_home / "profiles" / profile
    meta = _load_profile_metadata(profile_dir)
    soul_title, soul_desc = _read_soul_header(profile_dir)

    template_id = meta.get("template_id")
    tpl = _parse_template(template_id) if template_id else None

    name = meta.get("agent_name") or soul_title or profile.replace("agent-", "").replace("-", " ").title()
    description = soul_desc or (tpl or {}).get("description") or meta.get("description") or ""

    jobs = _load_profile_jobs(profile_dir, profile, meta)
    created_at = _profile_created_at(profile_dir, meta, jobs)

    executions: list[dict] = []
    for job in jobs:
        job_id = job.get("id")
        if not job_id:
            continue
        # Try API server first (sessions are stored there)
        api_runs = _fetch_cron_run_history(profile, job_id, limit=20)
        if api_runs:
            for item in api_runs:
                item["agent_name"] = name
                if not include_outputs:
                    item.pop("output", None)
                executions.append(item)
        else:
            # Fallback: check .md output files
            for report in list_job_outputs(hermes_home, profile, job_id):
                item = {**report, "profile": profile, "agent_name": name}
                if not include_outputs:
                    item.pop("output", None)
                executions.append(item)

    executions.sort(key=lambda item: item.get("started_at", ""), reverse=True)

    return {
        "profile": profile,
        "name": name,
        "description": description,
        "template_id": template_id,
        "template_name": (tpl or {}).get("name"),
        "created_at": created_at,
        "jobs": jobs,
        "execution_count": len(executions),
        "last_execution_at": executions[0]["started_at"] if executions else None,
        "executions": executions,
    }


@router.get("/agents")
def list_agents():
    """List AgentHub-managed agent profiles with linked cron jobs and report summaries."""
    hermes_home = _hermes_home()
    agents = [
        _build_agent_summary(profile, hermes_home, include_outputs=False)
        for profile in _list_agenthub_profiles(hermes_home)
    ]
    return {"agents": agents, "count": len(agents)}


@router.get("/agents/{profile}")
def get_agent(profile: str):
    """Full agent detail including execution history and report bodies."""
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", profile):
        raise HTTPException(status_code=400, detail="Invalid profile name")
    hermes_home = _hermes_home()
    profile_dir = hermes_home / "profiles" / profile
    if not profile_dir.is_dir() or not _is_agenthub_profile(profile, profile_dir):
        raise HTTPException(status_code=404, detail="Agent profile not found")
    return _build_agent_summary(profile, hermes_home, include_outputs=True)


@router.post("/agents/{profile}/run/{job_id}")
def run_job(profile: str, job_id: str):
    """Trigger an immediate run of a cron job. Auto-starts gateway if needed."""
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", profile):
        raise HTTPException(status_code=400, detail="Invalid profile name")
    hermes_home = _hermes_home()
    profile_dir = hermes_home / "profiles" / profile
    if not profile_dir.is_dir() or not _is_agenthub_profile(profile, profile_dir):
        raise HTTPException(status_code=404, detail="Agent profile not found")

    # Check gateway status first
    gw_running = False
    try:
        gw_result = subprocess.run(
            ["hermes", "-p", profile, "gateway", "status"],
            capture_output=True, text=True, timeout=10,
        )
        gw_running = gw_result.returncode == 0 and "running" in gw_result.stdout.lower()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    # Auto-start gateway if not running
    if not gw_running:
        try:
            subprocess.run(
                ["hermes", "-p", profile, "gateway", "start"],
                capture_output=True, text=True, timeout=30,
            )
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass

    cmd = ["hermes", "-p", profile, "cron", "run", job_id]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Hermes cron run timed out")
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Hermes CLI not found")

    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr.strip() or "cron run failed")

    msg = result.stdout.strip()
    return {"ok": True, "job_id": job_id, "profile": profile, "output": msg, "gateway_started": not gw_running}


@router.post("/agents/{profile}/run")
def run_agent(profile: str):
    """Trigger the first (or only) cron job in a profile."""
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", profile):
        raise HTTPException(status_code=400, detail="Invalid profile name")
    hermes_home = _hermes_home()
    profile_dir = hermes_home / "profiles" / profile
    if not profile_dir.is_dir() or not _is_agenthub_profile(profile, profile_dir):
        raise HTTPException(status_code=404, detail="Agent profile not found")

    # Find the job ID
    jobs_path = profile_dir / "cron" / "jobs.json"
    if jobs_path.is_file():
        try:
            data = json.loads(jobs_path.read_text(encoding="utf-8"))
            jobs = data.get("jobs", []) if isinstance(data, dict) else []
            if jobs:
                job_id = jobs[0].get("id")
                if job_id:
                    return run_job(profile, job_id)
        except (json.JSONDecodeError, OSError):
            pass

    # Fallback: parse from CLI
    stdout, _, code = _run_cron_list(profile)
    if code != 0:
        raise HTTPException(status_code=500, detail="Could not list jobs")
    parsed = _parse_cron_list_output(stdout)
    if not parsed:
        raise HTTPException(status_code=404, detail="No cron jobs in this profile")
    return run_job(profile, parsed[0]["id"])


@router.get("/jobs")
def list_jobs():
    """Legacy endpoint — returns AgentHub agents only (no global cron jobs)."""
    data = list_agents()
    flat: list[dict] = []
    for agent in data["agents"]:
        for job in agent.get("jobs", []):
            flat.append({**job, "agent_name": agent.get("name"), "description": agent.get("description")})
    return {"agents": flat, "count": len(flat), "error": None}


@router.get("/health")
def health():
    return {"ok": True}
