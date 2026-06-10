"""Sessions search endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Query

from services.session_db import search_sessions

router = APIRouter(tags=["sessions"])


@router.get("/api/system/sessions/search")
async def search_sessions_endpoint(
    q: str = Query(..., description="Search query string"),
    limit: int = Query(20, ge=1, le=100, description="Max results"),
) -> dict:
    """GET /api/system/sessions/search?q= — FTS5 search over sessions.

    Searches the local SQLite state.db using FTS5 indexing.
    """
    results = search_sessions(q, limit=limit)
    return {
        "query": q,
        "count": len(results),
        "results": results,
    }
