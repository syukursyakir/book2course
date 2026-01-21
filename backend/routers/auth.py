from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from services.supabase_client import verify_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Dependency to get current authenticated user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.split(" ")[1]
    user = await verify_token(token)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user


@router.get("/me")
async def get_current_user_info(user: dict = Depends(get_current_user)):
    """Get current user information."""
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "name": user.get("user_metadata", {}).get("name")
    }
