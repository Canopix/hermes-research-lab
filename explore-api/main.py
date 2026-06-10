"""Exploration API — FastAPI app with CORS and mounted routers."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS, EXPLORE_API_PORT
from routers import system, profiles, templates, sessions, extras
from services.hermes_client import close_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: nothing special needed
    yield
    # Shutdown: close httpx client
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

# Mount routers
app.include_router(system.router)
app.include_router(profiles.router)
app.include_router(templates.router)
app.include_router(sessions.router)
app.include_router(extras.router)


@app.get("/api/health")
async def health() -> dict:
    """GET /api/health — alias for /health."""
    return {"status": "ok", "service": "exploration-api"}
