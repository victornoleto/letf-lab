#!/usr/bin/env bash
# loop.sh — drives the AI-Swing redesign sequentially.
# Reads progress.md, picks the first pending task, executes it via headless claude,
# updates state, and continues. Stops on failure for inspection.
#
# Usage:
#   ./loop.sh              # run remaining tasks until done or failure
#   ./loop.sh --next       # run a single next task and exit
#   ./loop.sh --status     # print current state without running
#   ./loop.sh --reset      # reset all [~] / [!] to [ ] (re-runnable)
#   ./loop.sh --task NNN   # force-run a specific task by number (e.g. 003)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROGRESS="$ROOT/progress.md"
TASKS_DIR="$ROOT/tasks"
LOGS_DIR="$ROOT/logs"
PROJECT_ROOT="$(cd "$ROOT/.." && pwd)"

mkdir -p "$LOGS_DIR"

CLAUDE_BIN="${CLAUDE_BIN:-claude}"

# ---------- helpers ----------
say()  { printf '\033[1;36m▶\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; }

require() {
  command -v "$1" >/dev/null 2>&1 || { err "missing required: $1"; exit 1; }
}

mark() {
  # mark "<task-file>" "<new-status-char>"
  local file="$1" newchar="$2"
  python3 - "$PROGRESS" "$file" "$newchar" <<'PY'
import re, sys, pathlib
progress, fname, newchar = sys.argv[1], sys.argv[2], sys.argv[3]
text = pathlib.Path(progress).read_text()
pattern = re.compile(r'^- \[.\] ' + re.escape(fname) + r'(.*)$', re.M)
def repl(m): return f'- [{newchar}] {fname}{m.group(1)}'
new = pattern.sub(repl, text, count=1)
pathlib.Path(progress).write_text(new)
PY
}

next_task() {
  # prints first pending task filename, or empty if none
  grep -E '^- \[ \] task-' "$PROGRESS" 2>/dev/null | head -1 | sed -E 's/^- \[ \] ([^ ]+).*$/\1/'
}

show_status() {
  echo "─── progress.md ───"
  grep -E '^- \[' "$PROGRESS" || true
  echo "───────────────────"
  local pending done_count failed running
  pending=$(grep -cE '^- \[ \] task-' "$PROGRESS" || true)
  done_count=$(grep -cE '^- \[x\] task-' "$PROGRESS" || true)
  failed=$(grep -cE '^- \[!\] task-' "$PROGRESS" || true)
  running=$(grep -cE '^- \[~\] task-' "$PROGRESS" || true)
  printf "pending=%s  in_progress=%s  done=%s  failed=%s\n" \
    "${pending:-0}" "${running:-0}" "${done_count:-0}" "${failed:-0}"
}

reset_state() {
  python3 - "$PROGRESS" <<'PY'
import re, sys, pathlib
p = pathlib.Path(sys.argv[1])
text = p.read_text()
text = re.sub(r'^- \[[~!]\] (task-)', r'- [ ] \1', text, flags=re.M)
p.write_text(text)
PY
  ok "all in_progress / failed marked back to pending"
}

run_task() {
  local task_file="$1"
  local task_path="$TASKS_DIR/$task_file"

  if [[ ! -f "$task_path" ]]; then
    err "task file not found: $task_path"
    return 1
  fi

  local stamp
  stamp=$(date +%Y%m%d-%H%M%S)
  local log="$LOGS_DIR/${stamp}-${task_file%.md}.log"

  say "running: $task_file  (log: $log)"
  mark "$task_file" '~'

  local prompt
  prompt=$(cat <<EOF
You are executing one task in a sequenced redesign of the AI-Swing app.

The task description (this is your source of truth — follow it literally) is at:
$task_path

Working dir: $PROJECT_ROOT

Authoritative design specs live under:
$PROJECT_ROOT/design-export/

You MUST:
1. Read the task file end-to-end before editing anything.
2. Read every design-export file the task references.
3. Make ONLY the changes the task scopes — do not refactor unrelated code.
4. After edits, from $PROJECT_ROOT/frontend run:
     npx ng build --configuration=development
   The build MUST succeed with zero errors. If it fails, fix and retry.
5. Run any verification steps the task explicitly lists.
6. When done, print exactly this single final line on its own:
     TASK DONE: $task_file
7. If you cannot complete the task for a real reason, print:
     TASK FAILED: $task_file -- <one-line reason>
   and stop. Do not invent partial completions.

You are not allowed to edit the task file itself or any file under
$ROOT/. Only files under $PROJECT_ROOT/frontend/ and (if the task says so)
$PROJECT_ROOT/design-export/screenshots/ may change.

Begin.
EOF
)

  # Run claude in print mode, allow tool access to project, capture output
  if ! "$CLAUDE_BIN" \
        --print \
        --add-dir "$PROJECT_ROOT" \
        --dangerously-skip-permissions \
        "$prompt" 2>&1 | tee "$log"; then
    err "claude exited non-zero for $task_file (see $log)"
    mark "$task_file" '!'
    return 1
  fi

  # Validate completion sentinel
  if grep -qE "^TASK DONE: $task_file\$" "$log"; then
    mark "$task_file" 'x'
    ok "done: $task_file"
    return 0
  fi

  if grep -qE "^TASK FAILED: $task_file" "$log"; then
    err "task reported failure: $task_file"
    mark "$task_file" '!'
    return 1
  fi

  err "task did not emit TASK DONE / TASK FAILED sentinel ($task_file)"
  mark "$task_file" '!'
  return 1
}

# ---------- argv parsing ----------
mode="run-all"
forced_task=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --next)    mode="run-one"; shift ;;
    --status)  mode="status"; shift ;;
    --reset)   mode="reset"; shift ;;
    --task)    mode="run-forced"; forced_task="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,15p' "$0"
      exit 0 ;;
    *)
      err "unknown arg: $1"; exit 2 ;;
  esac
done

# ---------- preflight ----------
require python3
[[ -f "$PROGRESS" ]] || { err "missing $PROGRESS"; exit 1; }
[[ -d "$TASKS_DIR" ]] || { err "missing $TASKS_DIR"; exit 1; }

case "$mode" in
  status)
    show_status
    exit 0 ;;
  reset)
    reset_state
    exit 0 ;;
  run-forced)
    require "$CLAUDE_BIN"
    file=$(ls "$TASKS_DIR" | grep -E "^task-${forced_task}-" | head -1)
    if [[ -z "$file" ]]; then err "no task matches NNN=$forced_task"; exit 1; fi
    run_task "$file"
    exit $? ;;
  run-one)
    require "$CLAUDE_BIN"
    nxt=$(next_task)
    if [[ -z "$nxt" ]]; then ok "no pending tasks."; exit 0; fi
    run_task "$nxt"
    exit $? ;;
  run-all)
    require "$CLAUDE_BIN"
    while true; do
      nxt=$(next_task)
      if [[ -z "$nxt" ]]; then ok "all tasks complete."; show_status; exit 0; fi
      if ! run_task "$nxt"; then
        warn "stopping loop — fix the failure, then run --reset (or edit progress.md) and retry."
        show_status
        exit 1
      fi
    done ;;
esac
