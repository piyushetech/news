from fastapi import APIRouter

from app import __version__
from app.models.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", service="BriefNews-python", version=__version__)
