"""Tests for the on-demand AI chat service."""
from __future__ import annotations

import pytest

from ai_swing.services import ai_chat


def test_chat_raises_when_cli_not_configured(monkeypatch, db_session):
    monkeypatch.setattr(ai_chat.ai_cli.settings, "ai_cli_command", "")
    with pytest.raises(RuntimeError, match=r"not configured"):
        ai_chat.chat(db_session, user_id=1, question="oi")


def test_chat_rejects_empty_question(monkeypatch, db_session):
    monkeypatch.setattr(ai_chat.ai_cli.settings, "ai_cli_command", "opencode")
    with pytest.raises(ValueError, match=r"empty"):
        ai_chat.chat(db_session, user_id=1, question="   ")


def test_chat_rejects_overly_long_question(monkeypatch, db_session):
    monkeypatch.setattr(ai_chat.ai_cli.settings, "ai_cli_command", "opencode")
    with pytest.raises(ValueError, match=r"exceeds"):
        ai_chat.chat(db_session, user_id=1, question="x" * 2000)


def test_chat_calls_ai_cli_with_serialized_context(monkeypatch, db_session):
    monkeypatch.setattr(ai_chat.ai_cli.settings, "ai_cli_command", "opencode")
    captured: dict = {}

    def fake_run_prompt(system, user, **kw):
        captured["system"] = system
        captured["user"] = user
        return "Resposta sintética"

    monkeypatch.setattr(ai_chat.ai_cli, "run_prompt", fake_run_prompt)

    answer = ai_chat.chat(
        db_session, user_id=1, question="Como está minha carteira?",
        include_portfolio=False,
    )
    assert answer == "Resposta sintética"
    assert "Como está minha carteira?" in captured["user"]
    # The serialized context should be embedded as JSON in the user prompt
    assert '"strategies"' in captured["user"]
    assert '"recent_transitions_90d"' in captured["user"]
