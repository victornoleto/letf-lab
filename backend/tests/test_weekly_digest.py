"""Tests for the weekly digest service."""
from __future__ import annotations

from datetime import date, datetime, timezone

import pytest

from ai_swing.db.models import WeeklyDigest
from ai_swing.services import weekly_digest


def test_monday_of_returns_monday_for_each_weekday():
    assert weekly_digest._monday_of(date(2026, 5, 4)) == date(2026, 5, 4)  # Mon
    assert weekly_digest._monday_of(date(2026, 5, 7)) == date(2026, 5, 4)  # Thu
    assert weekly_digest._monday_of(date(2026, 5, 10)) == date(2026, 5, 4)  # Sun


def test_generate_digest_skips_when_cli_not_configured(monkeypatch, db_session):
    monkeypatch.setattr(weekly_digest.ai_cli.settings, "ai_cli_command", "")
    out = weekly_digest.generate_digest(db_session)
    assert out is None


def test_generate_digest_returns_existing_row_without_force(monkeypatch, db_session):
    monkeypatch.setattr(weekly_digest.ai_cli.settings, "ai_cli_command", "opencode")
    week = date(2026, 5, 4)
    pre = WeeklyDigest(
        week_start=week,
        body="cached",
        model="opencode",
        generated_at=datetime.now(timezone.utc),
    )
    db_session.add(pre)
    db_session.commit()

    # Should NOT call the CLI (return cached row)
    monkeypatch.setattr(
        weekly_digest.ai_cli, "run_prompt",
        lambda *a, **kw: pytest.fail("CLI should not run when cached"),
    )
    out = weekly_digest.generate_digest(db_session, week_start=week)
    assert out is not None
    assert out.body == "cached"


def test_generate_digest_force_recomputes(monkeypatch, db_session):
    monkeypatch.setattr(weekly_digest.ai_cli.settings, "ai_cli_command", "opencode")
    monkeypatch.setattr(
        weekly_digest.ai_cli, "run_prompt",
        lambda *a, **kw: "**TL;DR**\n- Sintético",
    )
    week = date(2026, 5, 4)

    out = weekly_digest.generate_digest(db_session, week_start=week, force=True)
    assert out is not None
    assert "TL;DR" in out.body

    # Re-run with force=True should overwrite
    monkeypatch.setattr(
        weekly_digest.ai_cli, "run_prompt", lambda *a, **kw: "novo body",
    )
    out2 = weekly_digest.generate_digest(db_session, week_start=week, force=True)
    assert out2.body == "novo body"
