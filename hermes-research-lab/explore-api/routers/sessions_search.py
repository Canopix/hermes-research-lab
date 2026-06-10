from fastapi import APIRouter, Query

from services.session_service import SessionService

router = APIRouter()


@router.get("/search")
async def search_sessions(q: str, limit: int = Query(20, ge=1, le=100)):
    results = SessionService.search_messages(q, limit=limit)
    return {"query": q, "results": results}
