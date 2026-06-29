from fastapi import Header, HTTPException, status

from app.core.config import settings


async def verify_internal_key(x_internal_key: str | None = Header(default=None)) -> None:
    if not x_internal_key or x_internal_key != settings.internal_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API key.",
        )
