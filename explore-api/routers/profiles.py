from fastapi import APIRouter, HTTPException

from services.hermes_reader import (
    list_profiles,
    get_profile,
    get_profile_memory as read_profile_memory,
)

router = APIRouter()


@router.get("")
async def get_profiles():
    return list_profiles()


@router.get("/{name}")
async def get_profile_detail(name: str):
    profile = get_profile(name)
    if not profile:
        raise HTTPException(404, f"Profile '{name}' not found")
    return profile


@router.get("/{name}/memory")
async def get_profile_memory(name: str):
    memory = read_profile_memory(name)
    if not memory:
        raise HTTPException(404, f"Profile '{name}' not found")
    return memory
