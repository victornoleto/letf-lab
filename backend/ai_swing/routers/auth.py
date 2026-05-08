"""Auth endpoints: login, logout, me. JWT in HttpOnly cookie."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ai_swing.auth.security import (
    authenticate_user,
    create_access_token,
    get_current_user,
)
from ai_swing.config import settings
from ai_swing.db import get_db
from ai_swing.db.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    # Plain str + lightweight check on purpose. EmailStr (via email-validator)
    # rejects RFC 6761 reserved TLDs like .local, which we use for the seeded
    # admin@letf-lab.local account. Auth itself just compares lowercased
    # strings against the DB, not the format.
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=200)


class UserDTO(BaseModel):
    id: int
    email: str
    name: str | None
    is_active: bool

    @classmethod
    def from_model(cls, user: User) -> "UserDTO":
        return cls(id=user.id, email=user.email, name=user.name, is_active=user.is_active)


@router.post("/login", response_model=UserDTO)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)) -> UserDTO:
    user = authenticate_user(db, body.email, body.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválidos",
        )
    token, expires_at = create_access_token(user.id)
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        expires=expires_at,
        path="/",
    )
    return UserDTO.from_model(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        secure=settings.auth_cookie_secure,
        samesite="lax",
        httponly=True,
    )


@router.get("/me", response_model=UserDTO)
def me(user: User = Depends(get_current_user)) -> UserDTO:
    return UserDTO.from_model(user)
