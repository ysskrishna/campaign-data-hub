.PHONY: start stop

start:
	@cd backend && uv run uvicorn app.main:app --reload --port 8000 & \
	cd frontend && npm run dev &

stop:
	-lsof -ti:8000 | xargs kill
	-lsof -ti:5173 | xargs kill
