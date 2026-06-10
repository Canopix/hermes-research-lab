import os
import yaml
from pathlib import Path
from typing import Any, Optional


HERMES_DIR = Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))


def get_hermes_dir() -> Path:
    return HERMES_DIR


def read_file(path: Path) -> Optional[str]:
    if path.exists():
        return path.read_text(encoding="utf-8")
    return None


def load_yaml(path: Path) -> dict:
    content = read_file(path)
    if content:
        return yaml.safe_load(content) or {}
    return {}


def get_hermes_version() -> str:
    config = load_yaml(HERMES_DIR / "config.yaml")
    return config.get("version", "unknown")


def get_provider() -> str:
    config = load_yaml(HERMES_DIR / "config.yaml")
    return config.get("provider", "unknown")


def list_profiles() -> list[dict]:
    profiles_dir = HERMES_DIR / "profiles"
    if not profiles_dir.exists():
        return []

    result = []
    for p in sorted(profiles_dir.iterdir()):
        if not p.is_dir() or p.name.startswith("."):
            continue

        config = load_yaml(p / "config.yaml")
        skills_dir = p / "skills"
        sessions_dir = p / "sessions"

        skills_count = 0
        if skills_dir.exists():
            skills_count = sum(1 for s in skills_dir.iterdir() if s.is_dir())

        sessions_count = 0
        if sessions_dir.exists():
            sessions_count = sum(1 for f in sessions_dir.glob("*.jsonl"))

        memory_preview = ""
        memory_path = p / "MEMORY.md"
        if memory_path.exists():
            memory_preview = memory_path.read_text(encoding="utf-8")[:500]

        result.append({
            "name": p.name,
            "model": config.get("model"),
            "provider": config.get("provider"),
            "soul": read_file(p / "SOUL.md"),
            "memory_preview": memory_preview,
            "memory_enabled": config.get("memory", {}).get("memory_enabled", False),
            "skills_count": skills_count,
            "sessions_count": sessions_count,
        })

    return result


def get_profile(name: str) -> Optional[dict]:
    profiles = list_profiles()
    for p in profiles:
        if p["name"] == name:
            return p
    return None


def get_profile_memory(name: str) -> Optional[dict]:
    profile_dir = HERMES_DIR / "profiles" / name
    if not profile_dir.exists():
        return None

    memory = read_file(profile_dir / "MEMORY.md") or ""
    user = read_file(profile_dir / "USER.md") or ""

    return {"profile": name, "memory": memory, "user": user}


def list_hooks() -> list[dict]:
    hooks_dir = HERMES_DIR / "hooks"
    if not hooks_dir.exists():
        return []

    hooks = []
    for h in sorted(hooks_dir.iterdir()):
        hook_file = h / "HOOK.yaml"
        if hook_file.exists():
            hooks.append({
                "name": h.name,
                "config": load_yaml(hook_file),
            })
    return hooks


def get_mcp_servers() -> list[dict]:
    config = load_yaml(HERMES_DIR / "config.yaml")
    return config.get("mcp", {}).get("servers", [])


def get_activity(limit: int = 50) -> list[dict]:
    activity_log = HERMES_DIR / "activity.jsonl"
    if not activity_log.exists():
        return []

    entries = []
    with open(activity_log, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                import json
                entries.append(json.loads(line))

    return entries[-limit:]
