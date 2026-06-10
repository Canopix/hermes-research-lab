"""WebSocket server for real-time execution updates.

Handles multiple simultaneous clients and broadcasts events:
  - agent:status_changed
  - execution:started
  - execution:completed
  - execution:error

Also subscribes to the Hermes API Server's event stream and
relays those events to connected WebSocket clients.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import httpx
import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("exploration-api.websocket")

router = APIRouter(tags=["websocket"])

# ── Connection pool ──────────────────────────────────────────────
_connections: dict[str, WebSocket] = {}
_event_queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
_broadcast_task: asyncio.Task | None = None


# ── Helpers ──────────────────────────────────────────────────────
def _make_event(event_type: str, payload: dict[str, Any] | None = None) -> dict:
    """Build a uniform WebSocket event envelope."""
    return {
        "type": event_type,
        "payload": payload or {},
    }


async def _broadcast_loop() -> None:
    """Continuously drain the event queue and broadcast to all clients."""
    while True:
        event = await _event_queue.get()
        msg = json.dumps(event)
        disconnected: list[str] = []

        for cid, ws in list(_connections.items()):
            try:
                await ws.send_text(msg)
            except Exception:
                disconnected.append(cid)

        for cid in disconnected:
            _connections.pop(cid, None)
            logger.warning("WebSocket client %s disconnected (broadcast cleanup)", cid)


# ── WebSocket endpoint ──────────────────────────────────────────
@router.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Handle a WebSocket client connection at /api/ws."""
    client_id = f"ws_{id(websocket)}"
    await websocket.accept()
    _connections[client_id] = websocket
    logger.info("WebSocket client connected: %s (total=%d)", client_id, len(_connections))

    await websocket.send_text(
        json.dumps(_make_event("system:connected", {"client_id": client_id}))
    )

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                msg = {"raw": data}

            cmd = msg.get("command", "")
            if cmd == "ping":
                await websocket.send_text(
                    json.dumps(_make_event("system:pong", {"echo": msg}))
                )
            elif cmd == "subscribe":
                logger.info("Client %s subscribed to: %s", client_id, msg.get("events", "all"))
                await websocket.send_text(
                    json.dumps(_make_event("system:subscribed", msg))
                )

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected: %s", client_id)
    except Exception as exc:
        logger.error("WebSocket error for %s: %s", client_id, exc)
    finally:
        _connections.pop(client_id, None)
        logger.info("WebSocket client removed: %s (total=%d)", client_id, len(_connections))


# ── Event emission (called from route handlers or external code) ─
async def _emit(event_type: str, payload: dict[str, Any] | None = None) -> None:
    """Put an event on the broadcast queue."""
    envelope = _make_event(event_type, payload)
    await _event_queue.put(envelope)


async def on_agent_status_changed(agent_id: str, status: str) -> None:
    await _emit("agent:status_changed", {"agent_id": agent_id, "status": status})


async def on_execution_started(execution_id: str, agent_id: str, template_id: str | None = None) -> None:
    await _emit("execution:started", {
        "execution_id": execution_id,
        "agent_id": agent_id,
        "template_id": template_id,
    })


async def on_execution_completed(execution_id: str, output: dict[str, Any] | None = None) -> None:
    await _emit("execution:completed", {
        "execution_id": execution_id,
        "output": output or {},
    })


async def on_execution_error(execution_id: str, error: str, details: dict[str, Any] | None = None) -> None:
    await _emit("execution:error", {
        "execution_id": execution_id,
        "error": error,
        "details": details or {},
    })


# ── Test/debug endpoint: trigger events via HTTP ────────────────
class TestEventPayload(BaseModel):
    event_type: str = "execution:started"
    agent_id: str = "test-agent"
    execution_id: str = "test-exec-1"
    template_id: str | None = "ai-researcher"


@router.post("/api/ws/test/event")
async def trigger_test_event(payload: TestEventPayload) -> dict:
    """POST /api/ws/test/event — trigger a test event for WebSocket verification."""
    if payload.event_type == "agent:status_changed":
        await on_agent_status_changed(payload.agent_id, "running")
    elif payload.event_type == "execution:started":
        await on_execution_started(payload.execution_id, payload.agent_id, payload.template_id)
    elif payload.event_type == "execution:completed":
        await on_execution_completed(payload.execution_id, {"summary": "Test complete"})
    elif payload.event_type == "execution:error":
        await on_execution_error(payload.execution_id, "Test error")
    else:
        raise HTTPException(status_code=400, detail=f"Unknown event type: {payload.event_type}")
    return {"status": "emitted", "type": payload.event_type, "connections": len(_connections)}


# ── Hermes event stream subscriber ──────────────────────────────
_event_stream_task: asyncio.Task | None = None


async def stream_hermes_events(base_url: str = "http://localhost:8642", api_key: str = "agenthub-local") -> None:
    """Subscribe to the Hermes API Server SSE event stream and relay events."""
    headers = {"Authorization": f"Bearer {api_key}", "Accept": "text/event-stream"}

    while True:
        try:
            async with httpx.AsyncClient(base_url=base_url, headers=headers, timeout=30.0) as client:
                async with client.stream("GET", "/api/system/events") as response:
                    if response.status_code != 200:
                        logger.warning("Event stream returned %d, retrying in 5s", response.status_code)
                        await asyncio.sleep(5)
                        continue

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        if line.startswith("data: "):
                            raw = line[6:]
                            try:
                                event = json.loads(raw)
                            except json.JSONDecodeError:
                                continue
                            event_type = event.get("type", "unknown")
                            await _emit(event_type, event.get("data", {}))

        except (httpx.HTTPError, asyncio.CancelledError, Exception) as exc:
            logger.warning("Event stream disconnected (%s), retrying in 5s...", exc)
            await asyncio.sleep(5)


async def start_event_stream(base_url: str = "http://localhost:8642", api_key: str = "agenthub-local") -> None:
    """Start the broadcast loop and the Hermes event stream subscriber."""
    global _broadcast_task, _event_stream_task

    if _broadcast_task is None or _broadcast_task.done():
        _broadcast_task = asyncio.create_task(_broadcast_loop())
        logger.info("Broadcast loop started")

    if _event_stream_task is None or _event_stream_task.done():
        _event_stream_task = asyncio.create_task(stream_hermes_events(base_url, api_key))
        logger.info("Event stream subscriber started")


async def stop_event_stream() -> None:
    """Cancel background tasks."""
    global _broadcast_task, _event_stream_task

    for name, task in [("_broadcast_task", _broadcast_task), ("_event_stream_task", _event_stream_task)]:
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    _broadcast_task = None
    _event_stream_task = None
    logger.info("All background tasks stopped")
