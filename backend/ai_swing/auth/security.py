"""Password hashing + JWT issuance/verification + FastAPI dependency.

The cookie holds a short-lived JWT (default 24h). Cookie is HttpOnly and,
when AUTH_COOKIE_SECURE=true, Secure+SameSite=Lax — so XSS can't steal it
and CSRF on cross-site is mitigated for state-changing requests.

We use the `bcrypt` package directly rather than passlib: passlib 1.7 is
unmaintained and breaks against bcrypt>=4 (it pokes at a removed
__about__.__version__ and runs a self-check that trips bcrypt's >72-byte
ValueError). bcrypt's API is small enough that we don't miss the wrapper.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ai_swing.config import settings
from ai_swing.db import get_db
from ai_swing.db.models import User

_JWT_ALG = "HS256"

# bcrypt rejects secrets longer than 72 bytes. Truncating matches OpenBSD
# behavior and is what passlib used to do silently. Anything beyond 72
# bytes adds no entropy in bcrypt's design.
_BCRYPT_MAX_BYTES = 72


def _to_bytes(plain: str) -> bytes:
    encoded = plain.encode("utf-8")
    return encoded[:_BCRYPT_MAX_BYTES]


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(_to_bytes(plain), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_to_bytes(plain), hashed.encode("utf-8"))
    except ValueError:
        # Malformed hash on disk — treat as failed auth, don't crash.
        return False


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
