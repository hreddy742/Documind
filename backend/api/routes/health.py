from fastapi import APIRouter
from backend.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    settings = get_settings()
    return {
        "status": "ok",
        "model": settings.OLLAMA_MODEL,
        "ollama_url": settings.OLLAMA_URL
    }
