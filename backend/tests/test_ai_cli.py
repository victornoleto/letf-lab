"""Tests for the OpenCode CLI wrapper.

Subprocess invocation is mocked; we only assert the wrapper builds the right
argv, parses JSONL events correctly, and surfaces upstream errors instead of
swallowing them.
"""
from __future__ import annotations

import json
import subprocess
from types import SimpleNamespace

import pytest

from ai_swing.services import ai_cli


def _stub_completed(stdout: str = "", stderr: str = "", returncode: int = 0):
    return SimpleNamespace(stdout=stdout, stderr=stderr, returncode=returncode)


def _events_to_stdout(events: list[dict]) -> str:
    return "\n".join(json.dumps(e) for e in events)


def test_run_prompt_concatenates_text_events(monkeypatch):
    captured: dict = {}

    def fake_run(cmd, **kwargs):
        captured["cmd"] = cmd
        captured["timeout"] = kwargs.get("timeout")
        events = [
            {"type": "step_start"},
            {"type": "text", "part": {"text": "hello "}},
            {"type": "text", "part": {"text": "world"}},
            {"type": "step_finish", "part": {"reason": "stop"}},
        ]
        return _stub_completed(stdout=_events_to_stdout(events))

    monkeypatch.setattr(subprocess, "run", fake_run)
    monkeypatch.setattr(ai_cli.settings, "ai_cli_command", "opencode")
    monkeypatch.setattr(ai_cli.settings, "ai_cli_model", "openai/gpt-5.4-mini-fast")
    monkeypatch.setattr(ai_cli.settings, "ai_cli_timeout_s", 42)

    out = ai_cli.run_prompt("system instructions", "user question")

    assert out == "hello world"
    assert captured["cmd"][:5] == [
        "opencode", "run", "--format", "json", "--model"
    ]
    assert captured["cmd"][5] == "openai/gpt-5.4-mini-fast"
    # The full message argv should embed both system and user, in that order.
    assert "system instructions" in captured["cmd"][6]
    assert "user question" in captured["cmd"][6]
    assert captured["timeout"] == 42


def test_run_prompt_raises_on_nonzero_exit(monkeypatch):
    monkeypatch.setattr(ai_cli.settings, "ai_cli_command", "opencode")
    monkeypatch.setattr(
        subprocess, "run",
        lambda *a, **kw: _stub_completed(stderr="boom", returncode=2),
    )
    with pytest.raises(RuntimeError, match=r"exit 2.*boom"):
        ai_cli.run_prompt("sys", "user")


def test_run_prompt_raises_on_upstream_error_event(monkeypatch):
    monkeypatch.setattr(ai_cli.settings, "ai_cli_command", "opencode")
    events = [
        {"type": "error", "error": {"name": "APIError",
         "data": {"message": "rate limited"}}},
    ]
    monkeypatch.setattr(
        subprocess, "run",
        lambda *a, **kw: _stub_completed(stdout=_events_to_stdout(events)),
    )
    with pytest.raises(RuntimeError, match=r"rate limited"):
        ai_cli.run_prompt("sys", "user")


def test_run_prompt_raises_on_empty_output(monkeypatch):
    monkeypatch.setattr(ai_cli.settings, "ai_cli_command", "opencode")
    # Only a step_finish event — no text payload at all.
    events = [{"type": "step_finish", "part": {"reason": "stop"}}]
    monkeypatch.setattr(
        subprocess, "run",
        lambda *a, **kw: _stub_completed(stdout=_events_to_stdout(events)),
    )
    with pytest.raises(RuntimeError, match=r"no text events"):
        ai_cli.run_prompt("sys", "user")


def test_run_prompt_raises_when_command_missing(monkeypatch):
    monkeypatch.setattr(ai_cli.settings, "ai_cli_command", "")
    with pytest.raises(RuntimeError, match=r"not configured"):
        ai_cli.run_prompt("sys", "user")


def test_is_configured(monkeypatch):
    monkeypatch.setattr(ai_cli.settings, "ai_cli_command", "")
    assert ai_cli.is_configured() is False
    monkeypatch.setattr(ai_cli.settings, "ai_cli_command", "opencode")
    assert ai_cli.is_configured() is True


def test_load_prompt_reads_from_prompts_dir(tmp_path, monkeypatch):
    prompt_file = tmp_path / "sample.md"
    prompt_file.write_text("hello prompt", encoding="utf-8")
    monkeypatch.setattr(ai_cli.settings, "ai_cli_prompts_dir", str(tmp_path))

    assert ai_cli.load_prompt("sample.md") == "hello prompt"


def test_run_prompt_propagates_timeout(monkeypatch):
    monkeypatch.setattr(ai_cli.settings, "ai_cli_command", "opencode")

    def fake_run(*a, **kw):
        raise subprocess.TimeoutExpired(cmd="opencode", timeout=kw.get("timeout"))

    monkeypatch.setattr(subprocess, "run", fake_run)
    with pytest.raises(subprocess.TimeoutExpired):
        ai_cli.run_prompt("sys", "user", timeout_s=5)
