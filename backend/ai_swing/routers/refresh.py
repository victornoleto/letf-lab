from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ai_swing.db import get_db
from ai_swing.services.refresh_service import get_refresh_service

router = APIRouter(prefix="/api/refresh", tags=["refresh"])


class RefreshStatus(BaseModel):
    last_started_at: datetime | None
    last_finished_at: datetime | None
    status: str | None
    n_strategies: int | None
    n_transitions: int | None
    error: str | None


@router.post("", status_code=status.HTTP_202_ACCEPTED)
def trigger(force: bool = False, db: Session = Depends(get_db)) -> RefreshStatus:
    svc = get_refresh_service()
    try:
        log = svc.refresh_all(db, force=force)
    except RuntimeError as exc:
        raise HTTPException(status_code=429, detail=str(exc))
    return RefreshStatus(
        last_started_at=log.started_at,
        last_finished_at=log.finished_at,
        status=log.status,
        n_strategies=log.n_strategies,
        n_transitions=log.n_transitions,
        error=log.error,
    )


@router.get("/status", response_model=RefreshStatus)
def get_status(db: Session = Depends(get_db)) -> RefreshStatus:
    svc = get_refresh_service()
    log = svc.latest_log(db)
    if log is None:
        return RefreshStatus(
            last_started_at=None,
            last_finished_at=None,
            status=None,
            n_strategies=None,
            n_transitions=None,
            error=None,
        )
    return RefreshStatus(
        last_started_at=log.started_at,
        last_finished_at=log.finished_at,
        status=log.status,
        n_strategies=log.n_strategies,
        n_transitions=log.n_transitions,
        error=log.error,
    )
