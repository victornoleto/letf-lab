.PHONY: help install install-backend install-frontend migrate seed dev backend frontend test test-backend test-frontend refresh clean

# Use the venv's bin/ directly so we don't need to source `.venv/bin/activate`
# in every recipe. If the venv doesn't exist yet, install-backend will create it.
VENV := backend/.venv
PY   := $(VENV)/bin/python
PIP  := $(VENV)/bin/pip
ALEMBIC  := $(VENV)/bin/alembic
UVICORN  := $(VENV)/bin/uvicorn
PYTEST   := $(VENV)/bin/pytest

help:
	@echo "AI-Swing — make targets"
	@echo "  install         install backend + frontend deps"
	@echo "  install-backend install backend deps in backend/.venv (uv preferred)"
	@echo "  install-frontend install frontend deps (npm)"
	@echo "  migrate         alembic upgrade head"
	@echo "  seed            create example strategies + indicators"
	@echo "  dev             backend + frontend in parallel (foreground)"
	@echo "  backend         FastAPI dev server (port 8000)"
	@echo "  frontend        Angular dev server (port 4200)"
	@echo "  test            run pytest + Angular tests"
	@echo "  refresh         trigger manual refresh via API"
	@echo "  clean           remove caches and build artifacts"

install: install-backend install-frontend

install-backend:
	@if [ ! -d "$(VENV)" ]; then \
	  echo "Creating venv at $(VENV)..."; \
	  if command -v uv >/dev/null 2>&1; then \
	    uv venv --python 3.12 $(VENV); \
	  else \
	    python3 -m venv $(VENV); \
	  fi; \
	fi
	@if command -v uv >/dev/null 2>&1; then \
	  cd backend && uv pip install --python ../$(VENV)/bin/python -e ".[dev]"; \
	else \
	  cd backend && ../$(VENV)/bin/pip install -e ".[dev]"; \
	fi

install-frontend:
	cd frontend && npm install

migrate:
	cd backend && ../$(ALEMBIC) upgrade head

seed:
	cd backend && ../$(PY) -m scripts.seed

backend:
	cd backend && ../$(UVICORN) ai_swing.main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm start

dev:
	@echo "Starting backend (8000) and frontend (4200)..."
	@(trap 'kill 0' INT; \
	  (cd backend && ../$(UVICORN) ai_swing.main:app --reload --host 0.0.0.0 --port 8000) & \
	  (cd frontend && npm start) & \
	  wait)

test: test-backend test-frontend

test-backend:
	cd backend && ../$(PYTEST) -v

test-frontend:
	cd frontend && npm test -- --watch=false --browsers=ChromeHeadless

refresh:
	curl -X POST http://localhost:8000/api/refresh

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true
	rm -rf $(VENV) backend/*.egg-info
	rm -rf frontend/dist frontend/.angular
