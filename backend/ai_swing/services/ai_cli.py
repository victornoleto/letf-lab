"""Local AI CLI wrapper (OpenCode by default).

Generic interface for running prompts against a CLI agent so the rest of the
app stays decoupled from a specific provider SDK. Reused by `ai_reports.py`,
and (in later phases) by the chat and weekly-digest features.

The wrapper invokes `opencode run --format json` and reassembles the
assistant's text from the JSONL event stream — `type=="text"` events carry
incremental output in `part.text`. Errors surface as `type=="error"` events.

If `settings.ai_cli_command` is empty the wrapper raises so callers can
short-circuit and treat AI as disabled.
"""
from __future__ import annotations

import json
import logging
import shlex
import subprocess
from pathlib import Path

from ai_swing.config import settings

logger = logging.getLogger(__name__)


def _resolve_prompts_dir() -> Path:
    raw = Path(settings.ai_cli_prompts_dir)
    if raw.is_absolute():
        return raw
    # services/ai_cli.py → parents[2] is the backend root
    backend_root = Path(__file__).resolve().parents[2]
    return (backend_root / raw).resolve()


def load_prompt(name: str) -> str:
    """Read a prompt file (system .md or user .txt) from the prompts dir."""
    return (_resolve_prompts_dir() / name).read_text(encoding="utf-8")


def is_configured() -> bool:
    return bool(settings.ai_cli_command)


def run_prompt(
    system: str,
    user: str,
    *,
    model: str | None = None,
    timeout_s: int | None = None,
) -> str:
    """Invoke the AI CLI and return the assistant's concatenated text output.

    Raises RuntimeError on subprocess failure, upstream API errors, or empty
    output. Raises subprocess.TimeoutExpired if the call exceeds timeout.
    """
    cmd_str = settings.ai_cli_command
    if not cmd_str:
        raise RuntimeError("ai_cli_command not configured")

    chosen_model = model or settings.ai_cli_model
    timeout = timeout_s if timeout_s is not None else settings.ai_cli_timeout_s

    cmd = shlex.split(cmd_str) + ["run", "--format", "json"]
    if chosen_model:
        cmd += ["--model", chosen_model]
    # `opencode run` has no --system flag; inline the system prompt above the
    # user payload with a clear separator. Keeps the wrapper portable to other
    # CLIs (e.g. claude -p) by changing only the argv assembly.
    full_message = f"{system.strip()}\n\n---\n\n{user.strip()}"
    cmd.append(full_message)

    logger.debug("ai_cli invoking command: %s", cmd[:5])
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if proc.returncode != 0:
        raise RuntimeError(
            f"ai_cli exit {proc.returncode}: {proc.stderr.strip()[:500]}"
        )

    chunks: list[str] = []
    error_event: dict | None = None
    for line in proc.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        et = event.get("type")
        if et == "error":
            error_event = event.get("error") or {}
        elif et == "text":
            text = (event.get("part") or {}).get("text") or ""
            if text:
                chunks.append(text)

    if error_event is not None:
        data = error_event.get("data") or {}
        msg = data.get("message") or json.dumps(error_event)[:300]
        raise RuntimeError(f"ai_cli upstream error: {msg[:300]}")

    if not chunks:
        raise RuntimeError(
            f"ai_cli returned no text events. stdout head: {proc.stdout[:500]!r}"
        )

    return "".join(chunks).strip()
