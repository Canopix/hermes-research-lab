"""Read cron job execution outputs from ~/.hermes/cron/output/{job_id}/*.md.

Hermes persists each run as a markdown file. The API Server does not always
expose GET /api/jobs/{id}/outputs, so AgentHub reads the files directly.
"""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path

from config import HERMES_HOME

_CRON_JOB_RE = re.compile(r"^#\s+Cron Job:\s*(.+)$", re.MULTILINE)
_RUN_TIME_RE = re.compile(r"\*\*Run Time:\*\*\s*(.+)", re.MULTILINE)
_RESPONSE_RE = re.compile(r"## Response\s*\n+(.*)", re.DOTALL)
_LINK_RE = re.compile(r"https?://[^\s\)>\"]+")


def _extract_title(text: str) -> str | None:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            title = stripped[2:].strip()
            if title and not title.lower().startswith("cron job"):
                return title
    return None


def _extract_excerpt(text: str, max_len: int = 240) -> str:
    # Skip agent preamble before the first horizontal rule, if present
    body = text
    if "\n---" in text:
        body = text.split("\n---", 1)[-1]

    skip_fragments = ("let me compile", "good, i now", "i'll compile", "here is the report")

    paragraphs: list[str] = []
    for line in body.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or stripped in {"---", "***"}:
            continue
        if stripped.startswith("*") and stripped.endswith("*") and len(stripped) < 120:
            continue
        lower = stripped.lower()
        if any(frag in lower for frag in skip_fragments):
            continue
        if stripped.startswith("**") and stripped.endswith("**") and len(stripped) < 100:
            continue
        paragraphs.append(stripped)
        if len(" ".join(paragraphs)) >= max_len:
            break

    excerpt = " ".join(paragraphs)
    if len(excerpt) > max_len:
        return excerpt[: max_len - 1].rstrip() + "…"
    return excerpt or text[:max_len].strip() + ("…" if len(text) > max_len else "")


def _parse_run_timestamp(run_time: str | None, filename_stem: str) -> str:
    if run_time:
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f"):
            try:
                return datetime.strptime(run_time.strip(), fmt).isoformat()
            except ValueError:
                continue
    # Fallback: filename like 2026-06-11_15-19-34
    try:
        return datetime.strptime(filename_stem, "%Y-%m-%d_%H-%M-%S").isoformat()
    except ValueError:
        return datetime.utcnow().isoformat()


def _parse_output_file(path: Path, job_id: str) -> dict:
    content = path.read_text(encoding="utf-8")
    job_name_match = _CRON_JOB_RE.search(content)
    run_time = _RUN_TIME_RE.search(content)
    response = _RESPONSE_RE.search(content)

    job_name = job_name_match.group(1).strip() if job_name_match else None
    started_at = _parse_run_timestamp(
        run_time.group(1) if run_time else None,
        path.stem,
    )
    raw_output = response.group(1).strip() if response else content.strip()
    is_silent = raw_output == "[SILENT]" or not raw_output

    if is_silent:
        display_output = raw_output or "[SILENT]"
        title = f"{job_name or 'Agente'} — sin novedades"
        excerpt = "El agente completó la corrida pero no encontró contenido nuevo que reportar."
        status = "completed"
    else:
        display_output = raw_output
        title = _extract_title(raw_output) or f"Reporte de {job_name or 'agente'}"
        excerpt = _extract_excerpt(raw_output)
        status = "success"

    link_count = len(_LINK_RE.findall(raw_output))

    return {
        "id": f"{job_id}-{path.stem}",
        "job_id": job_id,
        "job_name": job_name,
        "title": title,
        "excerpt": excerpt,
        "link_count": link_count,
        "is_silent": is_silent,
        "timestamp": started_at,
        "started_at": started_at,
        "status": status,
        "output": display_output if not is_silent else excerpt,
        "duration_ms": 0,
    }


def list_job_outputs(job_id: str, hermes_home: str | None = None) -> list[dict]:
    """List execution outputs for a job, newest first."""
    base = Path(hermes_home or HERMES_HOME) / "cron" / "output" / job_id
    if not base.is_dir():
        return []

    results: list[dict] = []
    for path in sorted(base.glob("*.md"), reverse=True):
        try:
            results.append(_parse_output_file(path, job_id))
        except OSError:
            continue
    return results


def list_all_job_outputs(hermes_home: str | None = None) -> list[dict]:
    """Scan every job output directory under cron/output/."""
    root = Path(hermes_home or HERMES_HOME) / "cron" / "output"
    if not root.is_dir():
        return []

    results: list[dict] = []
    for job_dir in sorted(root.iterdir()):
        if not job_dir.is_dir():
            continue
        results.extend(list_job_outputs(job_dir.name, hermes_home))
    results.sort(key=lambda item: item.get("started_at", ""), reverse=True)
    return results
