"""
Authentication router — login endpoint + current user info.
POST /api/auth/login  → returns JWT access token
GET  /api/auth/me     → returns current user profile
"""
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from database import get_db
from models.entities import User
from auth_utils import verify_password, create_access_token
from deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates a user with email + password.
    Returns a JWT Bearer token and user profile.

    Demo credentials (seeded automatically):
    - admin@nirikshan.gov.in          / admin123
    - ministry@nirikshan.gov.in       / ministry123
    - state.officer@nirikshan.gov.in  / state123
    - district@nirikshan.gov.in       / district123
    - mp@nirikshan.gov.in             / mp123
    """
    user = db.query(User).filter(
        User.email == payload.email.lower().strip(),
        User.is_active == True,
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the currently authenticated user's profile."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
    }


@router.get("/demo-users")
def get_demo_users(db: Session = Depends(get_db)):
    """
    Returns the list of demo users (no passwords) for the prototype login quick-select.
    """
    users = db.query(User.id, User.name, User.email, User.role).filter(User.is_active == True).all()
    return {
        "users": [
            {"id": u.id, "name": u.name, "email": u.email, "role": u.role}
            for u in users
        ]
    }
