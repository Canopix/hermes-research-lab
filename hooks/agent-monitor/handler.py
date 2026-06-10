import json
import os
from pathlib import Path
from datetime import datetime

ACTIVITY_LOG = Path.home() / ".hermes" / "activity.jsonl"


def handle_event(event_type: str, payload: dict):
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "event": event_type,
        "profile": payload.get("profile", "unknown"),
        "session_id": payload.get("session_id"),
    }

    if event_type == "agent:start":
        entry["prompt_preview"] = payload.get("prompt", "")[:200]
        entry["toolsets"] = payload.get("toolsets", [])

    elif event_type == "agent:step":
        entry["tool_name"] = payload.get("tool_name")
        entry["step_number"] = payload.get("step_number", 0)

    elif event_type == "agent:end":
        entry["total_steps"] = payload.get("total_steps", 0)
        entry["duration_ms"] = payload.get("duration_ms", 0)
        entry["tokens"] = payload.get("tokens", {})

    ACTIVITY_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(ACTIVITY_LOG, "a") as f:
        f.write(json.dumps(entry) + "\n")
