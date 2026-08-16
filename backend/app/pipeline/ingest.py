import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import EXPECTED_WEEKS, PLATFORMS
from app.models import CampaignMetric, Delivery
from app.pipeline.discover import discover_files
from app.pipeline.process import load_exchange_rates, process_file, quality_report_dict
from app.schemas import IngestDeliverySummary, IngestResult


def run_cadence_check(db: Session) -> list[str]:
    gaps: list[str] = []
    canonical = db.query(Delivery).filter(Delivery.is_canonical.is_(True)).all()
    present = {(d.platform, d.week_start.isoformat()) for d in canonical}
    for platform in PLATFORMS:
        for week in EXPECTED_WEEKS:
            if (platform, week) not in present:
                gaps.append(f"{platform}_{week}.{'json' if platform == 'linkedin_ads' else 'csv'}")
    return gaps


def load_spend_history(db: Session, exclude_filename: str | None = None) -> dict[tuple[str, str], list[float]]:
    q = db.query(CampaignMetric)
    if exclude_filename:
        delivery = db.query(Delivery).filter(Delivery.filename == exclude_filename).first()
        if delivery:
            q = q.filter(CampaignMetric.delivery_id != delivery.id)
    history: dict[tuple[str, str], list[float]] = {}
    for m in q.all():
        history.setdefault((m.platform, m.campaign_key), []).append(m.spend_usd)
    return history


def persist_delivery(db: Session, processed) -> Delivery:
    existing = db.query(Delivery).filter(Delivery.filename == processed.filename).first()

    if processed.is_canonical:
        old_canonical = (
            db.query(Delivery)
            .filter(
                Delivery.platform == processed.platform,
                Delivery.week_start == processed.week_start,
                Delivery.is_canonical.is_(True),
                Delivery.filename != processed.filename,
            )
            .first()
        )
        if old_canonical:
            db.delete(old_canonical)

    report_json = json.dumps(quality_report_dict(processed))

    if existing:
        db.query(CampaignMetric).filter(CampaignMetric.delivery_id == existing.id).delete()
        existing.file_hash = processed.file_hash
        existing.ingested_at = datetime.now(timezone.utc)
        existing.health = processed.health
        existing.is_canonical = processed.is_canonical
        existing.row_count_raw = processed.row_count_raw
        existing.row_count_accepted = len(processed.accepted_rows)
        existing.quality_report = report_json
        delivery = existing
    else:
        delivery = Delivery(
            platform=processed.platform,
            week_start=processed.week_start,
            filename=processed.filename,
            file_hash=processed.file_hash,
            ingested_at=datetime.now(timezone.utc),
            health=processed.health,
            is_canonical=processed.is_canonical,
            row_count_raw=processed.row_count_raw,
            row_count_accepted=len(processed.accepted_rows),
            quality_report=report_json,
        )
        db.add(delivery)
        db.flush()

    if processed.is_canonical:
        for row in processed.accepted_rows:
            db.add(
                CampaignMetric(
                    delivery_id=delivery.id,
                    platform=processed.platform,
                    campaign=row.campaign_display or row.campaign_raw or "",
                    campaign_key=row.campaign_key or "",
                    date=row.row_date,
                    spend_usd=row.spend_usd,
                    impressions=row.impressions,
                    clicks=row.clicks,
                )
            )

    db.commit()
    db.refresh(delivery)
    return delivery


def run_ingest(db: Session, filename: str | None = None) -> IngestResult:
    import time

    start = time.perf_counter()
    mode = "file" if filename else "all"
    files = discover_files(filename)

    if filename and not files:
        raise FileNotFoundError(filename)

    rates = load_exchange_rates()
    spend_history: dict[tuple[str, str], list[float]] = (
        load_spend_history(db, exclude_filename=filename) if filename else {}
    )
    canonical_slots: dict[tuple[str, str], str] = {}
    processed_summaries: list[IngestDeliverySummary] = []
    skipped_duplicates = 0

    for discovered in files:
        slot = (discovered.platform, discovered.week_start.isoformat())
        is_dup = slot in canonical_slots
        canonical_name = canonical_slots.get(slot)

        if not is_dup:
            canonical_slots[slot] = discovered.filename

        processed = process_file(
            discovered,
            rates,
            spend_history,
            canonical_slots,
            is_dup,
            canonical_name,
        )

        if is_dup:
            skipped_duplicates += 1

        persist_delivery(db, processed)
        processed_summaries.append(
            IngestDeliverySummary(
                filename=processed.filename,
                health=processed.health,
                row_count_accepted=len(processed.accepted_rows),
                is_canonical=processed.is_canonical,
            )
        )

    cadence_gaps: list[str] = []
    if mode == "all":
        cadence_gaps = run_cadence_check(db)

    health_counts = {"pass": 0, "warn": 0, "fail": 0}
    for s in processed_summaries:
        health_counts[s.health] = health_counts.get(s.health, 0) + 1

    canonical_count = sum(1 for s in processed_summaries if s.is_canonical)
    duration_ms = int((time.perf_counter() - start) * 1000)

    return IngestResult(
        mode=mode,
        files_discovered=len(files),
        files_processed=len(files),
        canonical_deliveries=canonical_count,
        skipped_duplicate_files=skipped_duplicates,
        health_counts=health_counts,
        deliveries=processed_summaries,
        cadence_gaps=cadence_gaps,
        duration_ms=duration_ms,
    )
