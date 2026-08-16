from fastapi import APIRouter, Body, Depends, Request
from sqlalchemy.orm import Session

from app.api.responses import error, success
from app.db import get_db
from app.pipeline.ingest import run_ingest
from app.schemas import IngestRequest

router = APIRouter(prefix="/api/v1", tags=["ingest"])


@router.post("/ingest")
def ingest(
    request: Request,
    body: IngestRequest | None = Body(default=None),
    db: Session = Depends(get_db),
):
    filename = body.filename if body else None
    try:
        result = run_ingest(db, filename=filename)
        return success(result, request)
    except FileNotFoundError:
        return error(
            request,
            404,
            "FILE_NOT_FOUND",
            f"File not found in data/deliveries: {filename}",
        )
