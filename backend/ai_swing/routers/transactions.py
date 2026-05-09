"""Transactions CRUD + portfolio aggregation."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ai_swing.auth.security import get_current_user
from ai_swing.db import get_db
from ai_swing.db.models import Transaction, User
from ai_swing.schemas.transaction import (
    PortfolioHistory,
    PortfolioSummary,
    TransactionCreate,
    TransactionDTO,
    TransactionUpdate,
)
from ai_swing.services.portfolio import compute_portfolio, compute_portfolio_history

router = APIRouter(prefix="/api", tags=["transactions"])


@router.get("/transactions", response_model=list[TransactionDTO])
def list_transactions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[TransactionDTO]:
    rows = db.scalars(
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(Transaction.date.desc(), Transaction.id.desc())
    ).all()
    return [TransactionDTO.model_validate(r) for r in rows]


@router.post("/transactions", response_model=TransactionDTO, status_code=status.HTTP_201_CREATED)
def create_transaction(
    body: TransactionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TransactionDTO:
    row = Transaction(user_id=user.id, **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return TransactionDTO.model_validate(row)


@router.put("/transactions/{tx_id}", response_model=TransactionDTO)
def update_transaction(
    tx_id: int,
    body: TransactionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TransactionDTO:
    row = db.get(Transaction, tx_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return TransactionDTO.model_validate(row)


@router.delete("/transactions/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    row = db.get(Transaction, tx_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(row)
    db.commit()


@router.get("/portfolio", response_model=PortfolioSummary)
def get_portfolio(
    currency: str = "USD",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PortfolioSummary:
    return compute_portfolio(db, user.id, display_currency=currency)


@router.get("/portfolio/history", response_model=PortfolioHistory)
def get_portfolio_history(
    benchmark: str = "SPY",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PortfolioHistory:
    return compute_portfolio_history(db, user.id, benchmark_ticker=benchmark)
