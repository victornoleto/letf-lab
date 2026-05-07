from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture(scope="session")
def temp_data_dir():
    with tempfile.TemporaryDirectory() as tmp:
        yield Path(tmp)


@pytest.fixture
def db_session(monkeypatch, tmp_path):
    """In-memory SQLite session with all tables created."""
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path}/test.db")
    monkeypatch.setenv("PRICE_CACHE_DIR", str(tmp_path / "prices"))
    # Reset settings cache
    from ai_swing import config as cfg

    cfg.settings = cfg.Settings()
    from ai_swing.db.base import Base

    engine = create_engine(f"sqlite:///{tmp_path}/test.db")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()
