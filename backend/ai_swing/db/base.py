from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from ai_swing.config import settings


class Base(DeclarativeBase):
    pass


def _engine_kwargs() -> dict:
    """Tune the engine per backend.

    SQLite needs check_same_thread=False to share the connection across
    threads (FastAPI). Postgres gets a small pool with pre-ping so dropped
    connections (e.g. server restart) self-recover instead of leaking 500s.
    """
    if settings.database_url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {
        "pool_size": 10,
        "max_overflow": 5,
        "pool_pre_ping": True,
        "pool_recycle": 1800,
    }


engine = create_engine(
    settings.database_url,
    echo=False,
    future=True,
    **_engine_kwargs(),
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
