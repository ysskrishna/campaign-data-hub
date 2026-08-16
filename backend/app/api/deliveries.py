import json

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.responses import error, success
from app.db import get_db
from app.models import Delivery
from app.schemas import DeliveryDetail, DeliveryListItem, HealthStatus

router = APIRouter(prefix="/api/v1", tags=["deliveries"])


@router.get("/health", response_model=None)
def health_check(request: Request):
    return success(HealthStatus(status="ok"), request)


@router.get("/deliveries")
def list_deliveries(
    request: Request,
    platform: str | None = None,
    health: str | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(Delivery)
    if platform:
        q = q.filter(Delivery.platform == platform)
    if health:
        q = q.filter(Delivery.health == health)
    deliveries = q.order_by(Delivery.week_start, Delivery.filename).all()
    data = [
        DeliveryListItem(
            id=d.id,
            platform=d.platform,
            week_start=d.week_start,
            filename=d.filename,
            health=d.health,
            is_canonical=d.is_canonical,
            row_count_raw=d.row_count_raw,
            row_count_accepted=d.row_count_accepted,
            ingested_at=d.ingested_at,
        )
        for d in deliveries
    ]
    return success(data, request)


@router.get("/deliveries/{delivery_id}")
def get_delivery(delivery_id: int, request: Request, db: Session = Depends(get_db)):
    d = db.get(Delivery, delivery_id)
    if not d:
        return error(request, 404, "NOT_FOUND", f"Delivery {delivery_id} not found")
    report = json.loads(d.quality_report)
    detail = DeliveryDetail(
        id=d.id,
        platform=d.platform,
        week_start=d.week_start,
        filename=d.filename,
        health=d.health,
        is_canonical=d.is_canonical,
        row_count_raw=d.row_count_raw,
        row_count_accepted=d.row_count_accepted,
        ingested_at=d.ingested_at,
        quality_summary=report.get("summary", {}),
    )
    return success(detail, request)


@router.get("/deliveries/{delivery_id}/quality-report")
def get_quality_report(delivery_id: int, request: Request, db: Session = Depends(get_db)):
    d = db.get(Delivery, delivery_id)
    if not d:
        return error(request, 404, "NOT_FOUND", f"Delivery {delivery_id} not found")
    return success(json.loads(d.quality_report), request)
