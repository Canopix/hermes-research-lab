"""Provision Hermes profiles for AgentHub agents via the Hermes CLI only."""
from __future__ import annotations

import asyncio
import os
import re
import shutil
from pathlib import Path

from config import HERMES_HOME
from services.template_parser import TEMPLATES_DIR, get_template, render_preview

AGENT_PROFILE_PREFIX = "agent-"
MAX_SLUG_LEN = 24


class ProfileProvisionError(Exception):
    """Raised when profile provisioning fails."""

    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def slugify_agent_name(name: str) -> str:
    """Normalize an agent display name to a Hermes-safe slug segment."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    if not slug:
        slug = "agent"
    return slug[:MAX_SLUG_LEN].rstrip("-")


def _profile_dir(name: str) -> Path:
    return Path(HERMES_HOME) / "profiles" / name


async def profile_exists(name: str) -> bool:
    """Return True if Hermes reports the profile exists."""
    returncode, _, _ = await _run_hermes(["profile", "show", name], check=False)
    return returncode == 0


async def resolve_profile_name(template_id: str, agent_name: str) -> str:
    """Resolve a unique AgentHub profile name for a new agent."""
    slug = slugify_agent_name(agent_name)
    safe_template = re.sub(r"[^a-z0-9-]+", "-", template_id.lower()).strip("-") or "template"
    base = f"{AGENT_PROFILE_PREFIX}{safe_template}-{slug}"

    candidate = base
    suffix = 2
    while await profile_exists(candidate):
        existing = candidate
        if not existing.startswith(AGENT_PROFILE_PREFIX):
            raise ProfileProvisionError(
                f"Profile name collision with non-AgentHub profile '{existing}'",
                status_code=409,
            )
        candidate = f"{base}-{suffix}"
        suffix += 1
        if suffix > 100:
            raise ProfileProvisionError(
                f"Could not resolve a unique profile name for '{agent_name}'",
                status_code=409,
            )

    return candidate


def _hermes_binary() -> str:
    path = shutil.which("hermes")
    if not path:
        raise ProfileProvisionError("Hermes CLI not available", status_code=503)
    return path


async def _run_hermes(args: list[str], *, check: bool = True) -> tuple[int, str, str]:
    """Run a hermes CLI command asynchronously. Returns (returncode, stdout, stderr)."""
    cmd = [_hermes_binary(), *args]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        result_stdout = stdout.decode() if stdout else ""
        result_stderr = stderr.decode() if stderr else ""
    except OSError as exc:
        raise ProfileProvisionError(f"Hermes CLI not available: {exc}", status_code=503) from exc

    if check and proc.returncode != 0:
        detail = (result_stderr or result_stdout or "unknown error").strip()
        raise ProfileProvisionError(
            f"hermes {' '.join(args)} failed: {detail}",
            status_code=502,
        )
    return proc.returncode, result_stdout, result_stderr


async def _resolve_base_profile() -> str | None:
    """Return the profile to clone from, if any."""
    override = os.environ.get("AGENTHUB_BASE_PROFILE", "").strip()
    if override:
        if await profile_exists(override):
            return override
        raise ProfileProvisionError(
            f"AGENTHUB_BASE_PROFILE '{override}' does not exist",
            status_code=502,
        )

    returncode, stdout, _ = await _run_hermes(["profile", "list"], check=False)
    if returncode != 0:
        return None

    for line in stdout.splitlines():
        stripped = line.strip()
        if stripped.startswith("◆"):
            # e.g. "◆default         qwen3.6 ..."
            name = stripped[1:].split()[0] if len(stripped) > 1 else ""
            if name and await profile_exists(name):
                return name

    profiles_dir = Path(HERMES_HOME) / "profiles"
    if profiles_dir.is_dir():
        for entry in sorted(profiles_dir.iterdir()):
            if entry.is_dir() and await profile_exists(entry.name):
                return entry.name

    if await profile_exists("default"):
        return "default"

    return None


async def _create_profile_via_cli(name: str, description: str) -> None:
    """Create a profile using Hermes CLI only."""
    args = ["profile", "create", name, "--description", description]
    base = await _resolve_base_profile()
    if base and base != name:
        args.extend(["--clone-from", base])
    await _run_hermes(args)


def _write_soul_md(profile_name: str, template_id: str, config: dict | None) -> None:
    """Write rendered SOUL.md into the Hermes-managed profile directory."""
    soul_content = render_preview(template_id, config or {}, TEMPLATES_DIR)
    if not soul_content.strip():
        tmpl = get_template(template_id, TEMPLATES_DIR)
        if tmpl and tmpl.get("body"):
            soul_content = tmpl["body"]

    profile_dir = _profile_dir(profile_name)
    if not profile_dir.is_dir():
        raise ProfileProvisionError(
            f"Hermes did not create profile directory for '{profile_name}'",
            status_code=502,
        )

    soul_path = profile_dir / "SOUL.md"
    soul_path.write_text(soul_content, encoding="utf-8")


def is_agenthub_profile(name: str | None) -> bool:
    """Return True if the profile was created by AgentHub."""
    return bool(name and name.startswith(AGENT_PROFILE_PREFIX))


async def delete_agent_profile(profile_name: str) -> None:
    """Delete an AgentHub-managed profile via Hermes CLI.

    Only profiles with the agent- prefix are removed. Raises ProfileProvisionError
    on failure.
    """
    if not is_agenthub_profile(profile_name):
        return

    if not await profile_exists(profile_name):
        return

    await _run_hermes(["profile", "delete", profile_name, "--yes"])


async def provision_agent_profile(
    template_id: str,
    agent_name: str,
    config: dict | None = None,
    *,
    description: str | None = None,
) -> str:
    """Create an isolated Hermes profile for an AgentHub agent.

    Returns the profile name. Raises ProfileProvisionError on failure.
    """
    if not re.fullmatch(r"[a-z0-9-]+", template_id.lower()):
        raise ProfileProvisionError(
            f"Invalid template id for profile naming: '{template_id}'",
            status_code=400,
        )

    profile_name = await resolve_profile_name(template_id, agent_name)

    tmpl = get_template(template_id, TEMPLATES_DIR)
    tmpl_desc = (tmpl or {}).get("description") or template_id
    desc = description or f"{tmpl_desc} — {agent_name}"

    await _create_profile_via_cli(profile_name, desc)
    _write_soul_md(profile_name, template_id, config)

    return profile_name
