"""Exploration API — FastAPI app with CORS and mounted routers."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import CORS_ORIGINS, EXPLORE_API_PORT
from routers import system, profiles, templates, sessions, extras, jobs
from routers import websocket as websocket_router
from routers import executions
from services.hermes_client import close_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Start WebSocket event stream subscriber
    await websocket_router.start_event_stream()
    yield
    # Shutdown: close httpx client and event stream
    await websocket_router.stop_event_stream()
    await close_client()


app = FastAPI(
    title="Exploration API",
    description="API extras para Hermes AgentHub — system overview, profiles, templates, sessions search, hooks, MCP servers, cron, activity.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def validate_api_key(request: Request, call_next):
    """Validate API key on all endpoints except health and WebSocket."""
    path = request.url.path
    if path in ("/health", "/api/health") or path.startswith("/api/ws"):
        return await call_next(request)

    auth = request.headers.get("Authorization", "")
    x_api_key = request.headers.get("X-API-Key", "")
    token = auth.replace("Bearer ", "") if auth.startswith("Bearer ") else ""

    from config import HERMES_API_KEY
    if token != HERMES_API_KEY and x_api_key != HERMES_API_KEY:
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid or missing API key"},
        )

    return await call_next(request)


# Mount routers
app.include_router(system.router)
app.include_router(profiles.router)
app.include_router(templates.router)
app.include_router(sessions.router)
app.include_router(extras.router)
app.include_router(jobs.router)
app.include_router(websocket_router.router)
app.include_router(executions.router)


@app.get("/api/health")
async def health() -> dict:
    """GET /api/health — alias for /health."""
    return {"status": "ok", "service": "exploration-api"}
