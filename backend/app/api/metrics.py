from datetime import date

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.responses import error, success
from app.db import get_db
from app.models import CampaignMetric
from app.schemas import CampaignMetricsRow, MetricsSummary, PlatformMetrics

router = APIRouter(prefix="/api/v1/metrics", tags=["metrics"])


def parse_platforms(platform: str | None) -> list[str] | None:
    if not platform:
        return None
    return [p.strip() for p in platform.split(",") if p.strip()]


def derived_ctr(impressions: int, clicks: int) -> float | None:
    if impressions == 0:
        return None
    return clicks / impressions


def derived_cpc(spend: float, clicks: int) -> float | None:
    if clicks == 0:
        return None
    return spend / clicks


def base_query(db: Session, platforms: list[str] | None, start: date | None, end: date | None):
    q = db.query(CampaignMetric)
    if platforms:
        q = q.filter(CampaignMetric.platform.in_(platforms))
    if start:
        q = q.filter(CampaignMetric.date >= start)
    if end:
        q = q.filter(CampaignMetric.date <= end)
    return q


@router.get("/campaigns")
def list_campaigns(
    request: Request,
    platform: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    sort: str = Query("spend_usd"),
    order: str = Query("desc"),
    db: Session = Depends(get_db),
):
    if start_date and end_date and start_date > end_date:
        return error(request, 400, "VALIDATION_ERROR", "start_date must be before end_date")

    platforms = parse_platforms(platform)
    q = base_query(db, platforms, start_date, end_date)

    rows = (
        q.with_entities(
            CampaignMetric.campaign_key,
            func.min(CampaignMetric.campaign).label("campaign"),
            CampaignMetric.platform,
            func.sum(CampaignMetric.spend_usd).label("spend_usd"),
            func.sum(CampaignMetric.impressions).label("impressions"),
            func.sum(CampaignMetric.clicks).label("clicks"),
        )
        .group_by(CampaignMetric.campaign_key, CampaignMetric.platform)
        .all()
    )

    result = []
    for row in rows:
        spend = float(row.spend_usd)
        impressions = int(row.impressions)
        clicks = int(row.clicks)
        result.append(
            CampaignMetricsRow(
                campaign=row.campaign,
                platform=row.platform,
                spend_usd=round(spend, 2),
                impressions=impressions,
                clicks=clicks,
                ctr=derived_ctr(impressions, clicks),
                cpc=derived_cpc(spend, clicks),
            )
        )

    if sort == "ctr":
        result.sort(
            key=lambda r: r.ctr if r.ctr is not None else (-1 if order == "desc" else float("inf")),
            reverse=order == "desc",
        )
    else:
        result.sort(key=lambda r: r.spend_usd, reverse=order == "desc")

    meta = {
        "filters": {
            "platform": platform,
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
        },
        "sort": sort,
        "order": order,
    }
    return success({"rows": [r.model_dump() for r in result]}, request, meta=meta)


@router.get("/summary")
def metrics_summary(
    request: Request,
    platform: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
):
    platforms = parse_platforms(platform)
    q = base_query(db, platforms, start_date, end_date)
    row = q.with_entities(
        func.sum(CampaignMetric.spend_usd),
        func.sum(CampaignMetric.impressions),
        func.sum(CampaignMetric.clicks),
    ).one()
    spend = float(row[0] or 0)
    impressions = int(row[1] or 0)
    clicks = int(row[2] or 0)
    summary = MetricsSummary(
        spend_usd=round(spend, 2),
        impressions=impressions,
        clicks=clicks,
        ctr=derived_ctr(impressions, clicks),
        cpc=derived_cpc(spend, clicks),
    )
    return success(summary, request, meta={"filters": {"platform": platform, "start_date": start_date, "end_date": end_date}})


@router.get("/by-platform")
def metrics_by_platform(
    request: Request,
    platform: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
):
    platforms = parse_platforms(platform)
    q = base_query(db, platforms, start_date, end_date)
    rows = (
        q.with_entities(
            CampaignMetric.platform,
            func.sum(CampaignMetric.spend_usd),
            func.sum(CampaignMetric.impressions),
            func.sum(CampaignMetric.clicks),
        )
        .group_by(CampaignMetric.platform)
        .all()
    )
    result = []
    for plat, spend, impressions, clicks in rows:
        spend_f = float(spend)
        imp = int(impressions)
        clk = int(clicks)
        result.append(
            PlatformMetrics(
                platform=plat,
                spend_usd=round(spend_f, 2),
                impressions=imp,
                clicks=clk,
                ctr=derived_ctr(imp, clk),
                cpc=derived_cpc(spend_f, clk),
            )
        )
    return success(result, request)
