"""Password hashing + JWT issuance/verification + FastAPI dependency.

The cookie holds a short-lived JWT (default 24h). Cookie is HttpOnly and,
when AUTH_COOKIE_SECURE=true, Secure+SameSite=Lax — so XSS can't steal it
and CSRF on cross-site is mitigated for state-changing requests.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import Cookie, Depends, HTTPException, status
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from ai_swing.config import settings
from ai_swing.db import get_db
from ai_swing.db.models import User

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_JWT_ALG = "HS256"


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.scalars(select(User).where(User.email == email.lower())).first()
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_access_token(user_id: int) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.auth_token_ttl_hours)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "exp": int(expires_at.timestamp()),
        "iat": int(datetime.now(timezone.utc).timestamp()),
    }
    token = jwt.encode(payload, settings.auth_jwt_secret, algorithm=_JWT_ALG)
    return token, expires_at


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.auth_jwt_secret, algorithms=[_JWT_ALG])
    except jwt.PyJWTError:
        return None
    sub = payload.get("sub")
    if sub is None:
        return None
    try:
        return int(sub)
    except (TypeError, ValueError):
        return None


def get_current_user(
    db: Session = Depends(get_db),
    token: str | None = Cookie(default=None, alias=settings.auth_cookie_name),
) -> User:
    """FastAPI dependency. Raises 401 if no valid session cookie."""
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
