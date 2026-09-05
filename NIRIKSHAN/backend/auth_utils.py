"""
JWT authentication utilities.
Uses bcrypt directly (passlib has a version-detection bug with bcrypt>=4.x).
python-jose + bcrypt are already in requirements.txt.
"""
import datetime
from typing import Optional
import bcrypt
from jose import JWTError, jwt
from config import settings


def hash_password(plain: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    payload = data.copy()
    expire = datetime.datetime.now(datetime.UTC) + (
        expires_delta or datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
