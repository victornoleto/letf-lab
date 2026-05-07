"""On-demand AI chat over the user's portfolio."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ai_swing.auth.security import get_current_user
from ai_swing.db import get_db
from ai_swing.db.models import User
from ai_swing.schemas.chat import ChatRequest, ChatResponse
from ai_swing.services import ai_chat

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat_endpoint(
    body: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChatResponse:
    if not ai_chat.is_available():
        raise HTTPException(
            status_code=503,
            detail="AI chat indisponível (configure AI_CLI_COMMAND)",
        )
    try:
        answer = ai_chat.chat(
            db, user.id, body.question, include_portfolio=body.include_portfolio
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        logger.warning("AI chat failed: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc))
    return ChatResponse(answer=answer)
