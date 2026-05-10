"""Weekly digest endpoints."""
from __future__ import annotations

import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ai_swing.db import get_db
from ai_swing.schemas.weekly_digest import WeeklyDigestDTO, WeeklyDigestListDTO
from ai_swing.services import weekly_digest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/weekly-digest", tags=["weekly-digest"])


@router.get("", response_model=WeeklyDigestListDTO)
def list_endpoint(
    limit: int = Query(default=12, ge=1, le=52),
    db: Session = Depends(get_db),
) -> WeeklyDigestListDTO:
    rows = weekly_digest.latest_digests(db, limit=limit)
    return WeeklyDigestListDTO(
        digests=[WeeklyDigestDTO.model_validate(r) for r in rows],
    )


@router.post("/regenerate", response_model=WeeklyDigestDTO)
def regenerate_endpoint(
    week_start: date | None = None,
    db: Session = Depends(get_db),
) -> WeeklyDigestDTO:
    digest = weekly_digest.generate_digest(db, week_start=week_start, force=True)
    if digest is None:
        raise HTTPException(
            status_code=503,
            detail="Weekly digest unavailable (configure AI_CLI_COMMAND)",
        )
    return WeeklyDigestDTO.model_validate(digest)
