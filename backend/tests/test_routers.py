from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def client(monkeypatch, tmp_path):
    db_url = f"sqlite:///{tmp_path}/test.db"
    monkeypatch.setenv("DATABASE_URL", db_url)
    monkeypatch.setenv("PRICE_CACHE_DIR", str(tmp_path / "prices"))
    monkeypatch.setenv("ALLOW_ORIGINS", "http://localhost:4200")

    # Refresh settings + rebind engine
    from ai_swing import config as cfg

    cfg.settings = cfg.Settings()
    from ai_swing.db import base as db_base

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    db_base.engine = engine
    db_base.SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
    db_base.Base.metadata.create_all(engine)

    # Disable scheduler in tests by stubbing start/stop
    from ai_swing import scheduler as sched

    monkeypatch.setattr(sched, "start_scheduler", lambda: None)
    monkeypatch.setattr(sched, "stop_scheduler", lambda: None)

    from ai_swing.main import create_app

    app = create_app()
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_indicator_types(client):
    r = client.get("/api/indicators/types")
    assert r.status_code == 200
    types = r.json()
    assert {t["type"] for t in types} == {"SMA_GATE", "EMA_GATE", "VOL_GATE", "AR1_GATE"}


def test_indicator_crud(client):
    # Create
    r = client.post(
        "/api/indicators",
        json={"name": "SMA200", "type": "SMA_GATE", "params": {"period": 200}},
    )
    assert r.status_code == 201, r.text
    ind = r.json()
    assert ind["name"] == "SMA200"
    assert ind["params"]["period"] == 200

    # List
    r = client.get("/api/indicators")
    assert r.status_code == 200
    assert len(r.json()) == 1

    # Update
    r = client.put(f"/api/indicators/{ind['id']}", json={"params": {"period": 100}})
    assert r.status_code == 200
    assert r.json()["params"]["period"] == 100

    # Duplicate name
    r = client.post(
        "/api/indicators",
        json={"name": "SMA200", "type": "SMA_GATE", "params": {"period": 50}},
    )
    assert r.status_code == 409

    # Delete
    r = client.delete(f"/api/indicators/{ind['id']}")
    assert r.status_code == 204


def test_strategy_creation_with_indicators(client):
    r = client.post(
        "/api/indicators",
        json={"name": "SMA50", "type": "SMA_GATE", "params": {"period": 50}},
    )
    ind_id = r.json()["id"]

    r = client.post(
        "/api/strategies",
        json={
            "name": "test",
            "benchmark_ticker": "qqq",
            "risk_on_ticker": "tqqq",
            "risk_off_ticker": "zroz",
            "k_threshold": 1,
            "indicator_ids": [ind_id],
        },
    )
    assert r.status_code == 201, r.text
    s = r.json()
    assert s["benchmark_ticker"] == "QQQ"
    assert len(s["indicators"]) == 1


def test_strategy_k_threshold_validation(client):
    r = client.post(
        "/api/indicators",
        json={"name": "x", "type": "SMA_GATE", "params": {"period": 50}},
    )
    ind_id = r.json()["id"]

    r = client.post(
        "/api/strategies",
        json={
            "name": "bad",
            "benchmark_ticker": "qqq",
            "risk_on_ticker": "tqqq",
            "risk_off_ticker": "zroz",
            "k_threshold": 5,
            "indicator_ids": [ind_id],
        },
    )
    assert r.status_code == 400


def test_indicator_in_use_blocks_delete(client):
    r = client.post(
        "/api/indicators",
        json={"name": "x", "type": "SMA_GATE", "params": {"period": 50}},
    )
    ind_id = r.json()["id"]

    client.post(
        "/api/strategies",
        json={
            "name": "s",
            "benchmark_ticker": "qqq",
            "risk_on_ticker": "tqqq",
            "risk_off_ticker": "zroz",
            "k_threshold": 1,
            "indicator_ids": [ind_id],
        },
    )

    r = client.delete(f"/api/indicators/{ind_id}")
    assert r.status_code == 409
