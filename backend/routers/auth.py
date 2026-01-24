import logging
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from services.supabase_client import verify_token, delete_user_account

logger = logging.getLogger(__name__)

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


@router.delete("/account")
async def delete_account(user: dict = Depends(get_current_user)):
    """
    Delete the current user's account and all associated data.
    This is a destructive action and cannot be undone.
    """
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid user")

    try:
        # Delete all user data from database
        await delete_user_account(user_id)

        logger.info(f"Account deleted for user {user_id}")

        return {
            "success": True,
            "message": "Account and all associated data have been deleted"
        }

    except Exception as e:
        logger.error(f"Failed to delete account for user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete account. Please try again or contact support."
        )
