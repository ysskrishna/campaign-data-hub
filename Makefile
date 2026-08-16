.PHONY: install start stop ingest test

install:
	cd backend && uv sync --extra dev
	cd frontend && npm install

start:
	@cd backend && uv run uvicorn app.main:app --reload --port 8000 & \
	cd frontend && npm run dev &

stop:
	-lsof -ti:8000 | xargs kill
	-lsof -ti:5173 | xargs kill

ingest:
	curl -s -X POST http://localhost:8000/api/v1/ingest | python3 -m json.tool

test:
	cd backend && uv run pytest tests/e2e -v
