# One-stop developer commands. Windows users without make: run the
# commands under each target directly (see CONTRIBUTING.md).
PY ?= python3
VENV ?= .venv
BIN := $(VENV)/bin

.PHONY: setup dev-backend dev-frontend dev-daemon check test lint format openapi clean demo

setup:            ## Create the venv and install every dependency
	$(PY) -m venv $(VENV)
	$(BIN)/pip install -q -r backend/requirements-dev.txt
	cd frontend && npm ci
	cd sdk/js && npm ci

dev-backend:      ## API on :8000 with auto-reload
	cd backend && ../$(BIN)/python run.py

dev-frontend:     ## Dashboard on :5173 (proxies /api and /ws to :8000)
	cd frontend && npm run dev

dev-daemon:       ## Transcript poller
	$(BIN)/python -m telemetry.daemon

lint:
	$(BIN)/ruff check .
	$(BIN)/ruff format --check .
	cd frontend && npm run lint && npm run format:check

format:
	$(BIN)/ruff check --fix .
	$(BIN)/ruff format .
	cd frontend && npm run format

test:
	$(BIN)/python -m pytest --cov
	cd frontend && npm test
	cd cli && node --test test/*.test.js
	cd sdk/js && npm test

openapi:          ## Regenerate docs/openapi.json after API changes
	$(BIN)/python scripts/export_openapi.py

demo:             ## Seed a fictional dataset into ./.demo and serve it on :8000
	rm -rf .demo && $(BIN)/python scripts/seed_demo.py --out .demo
	CLAUDE_TELEMETRY_DB=.demo/telemetry.db KNOWYOURTOKENS_SOURCES=none $(BIN)/python -m uvicorn app.main:app --app-dir backend --port 8000

check: lint test openapi-check  ## Everything CI runs (minus the cross-OS matrix)
	cd frontend && npm run build

openapi-check:
	$(BIN)/python scripts/export_openapi.py --check

clean:
	rm -rf frontend/dist cli/vendor site/dist sdk/js/dist .coverage coverage.xml .pytest_cache .ruff_cache
