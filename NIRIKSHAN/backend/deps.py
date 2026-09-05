"""
get_current_user FastAPI dependency.
Reads Bearer token from Authorization header, validates JWT, returns User object.
For prototype demo: unauthenticated requests still pass (returns a system guest user)
so no page breaks while we wire auth progressively.
"""
from typing import Optional
from fastapi import Depends, Header
from sqlalchemy.orm import Session
from database import get_db
from models.entities import User
from auth_utils import decode_access_token


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Returns the authenticated User from the JWT Bearer token, or None if unauthenticated.
    Currently optional — no endpoint raises 401 for missing token (prototype phase).
    Use get_required_user for write-protected endpoints.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    if not payload:
        return None
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    return user if user and user.is_active else None


def get_required_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    """
    Same as get_current_user but raises 401 if no valid token is present.
    Use this on write endpoints (decisions, assignments, uploads).
    """
    from fastapi import HTTPException, status
    user = get_current_user(authorization, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
