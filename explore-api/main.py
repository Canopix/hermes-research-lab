from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import system, templates, profiles, sessions_search

app = FastAPI(
    title="AgentHub Exploration API",
    description="API for exploring Hermes agent system",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router, prefix="/api/system", tags=["system"])
app.include_router(profiles.router, prefix="/api/system/profiles", tags=["profiles"])
app.include_router(sessions_search.router, prefix="/api/system/sessions", tags=["sessions"])
app.include_router(templates.router, prefix="/api/templates", tags=["templates"])


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
