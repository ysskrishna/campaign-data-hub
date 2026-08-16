from statistics import median

from app.config import EXCHANGE_RATES_PATH
from app.pipeline.discover import DiscoveredFile, file_hash
from app.pipeline.normalize import (
    campaign_key,
    parse_date,
    safe_float,
    safe_int,
    week_window_ok,
)
from app.pipeline.parsers.readers import parse_google, parse_linkedin, parse_meta
from app.pipeline.quality.classifier import classify_health, summarize_checks
from app.pipeline.types import CheckResult, ProcessedFile, RawRow, RejectedRow

OUTLIER_MULTIPLIER = 10


def load_exchange_rates() -> dict[str, float]:
    import json

    data = json.loads(EXCHANGE_RATES_PATH.read_text(encoding="utf-8"))
    return data.get("rates", {})


def normalize_row(row: RawRow, platform: str, rates: dict[str, float]) -> None:
    raw = row.raw
    if platform == "meta_ads":
        row.campaign_raw = (raw.get("campaign_name") or "").strip()
        row.row_date = parse_date(raw.get("date"))
        row.spend_usd = safe_float(raw.get("spend_usd"))
        row.impressions = safe_int(raw.get("impressions"))
        row.clicks = safe_int(raw.get("clicks"))
        row.currency = "USD"
    elif platform == "google_ads":
        row.campaign_raw = (raw.get("Campaign") or "").strip()
        row.row_date = parse_date(raw.get("Day"))
        micros = safe_float(raw.get("Cost (micros)"))
        row.spend_usd = micros / 1_000_000 if micros is not None else None
        row.impressions = safe_int(raw.get("Impr."))
        row.clicks = safe_int(raw.get("Clicks"))
        row.currency = (raw.get("Currency") or "USD").strip().upper()
    elif platform == "linkedin_ads":
        row.campaign_raw = (raw.get("campaign") or "").strip()
        row.row_date = parse_date(raw.get("date_ts"))
        spend = raw.get("spend") or {}
        row.currency = (spend.get("currency") or "").strip().upper()
        amount = safe_float(spend.get("amount"))
        rate = rates.get(row.currency)
        row.spend_usd = amount * rate if amount is not None and rate is not None else None
        row.impressions = safe_int(raw.get("impressions"))
        row.clicks = safe_int(raw.get("clicks"))

    if row.campaign_raw:
        row.campaign_key = campaign_key(row.campaign_raw)
        row.campaign_display = row.campaign_raw.strip()


def spend_median(
    spend_history: dict[tuple[str, str], list[float]],
    platform: str,
    key: str,
) -> float | None:
    values = spend_history.get((platform, key))
    if not values:
        return None
    return median(values)


def process_file(
    discovered: DiscoveredFile,
    rates: dict[str, float],
    spend_history: dict[tuple[str, str], list[float]],
    canonical_slots: dict[tuple[str, str], str],
    is_duplicate_delivery: bool,
    canonical_filename: str | None,
) -> ProcessedFile:
    checks: list[CheckResult] = []
    rejected: list[RejectedRow] = []
    accepted: list[RawRow] = []

    if discovered.platform == "meta_ads":
        raw_rows, err = parse_meta(discovered.path)
    elif discovered.platform == "google_ads":
        raw_rows, err = parse_google(discovered.path)
    else:
        raw_rows, err = parse_linkedin(discovered.path)

    if err:
        checks.append(
            CheckResult("file_readable", "file", "fail", f"Cannot parse file: {err}")
        )
        return ProcessedFile(
            platform=discovered.platform,
            week_start=discovered.week_start,
            filename=discovered.filename,
            file_hash=file_hash(discovered.path),
            row_count_raw=0,
            accepted_rows=[],
            checks=checks,
            rejected_rows=[],
            health="fail",
            is_canonical=not is_duplicate_delivery,
        )

    checks.append(CheckResult("file_readable", "file", "pass", "File parsed successfully"))

    if is_duplicate_delivery:
        checks.append(
            CheckResult(
                "duplicate_delivery",
                "delivery",
                "warn",
                f"Duplicate file for {discovered.platform} week {discovered.week_start}; first file is canonical",
                {
                    "canonical_filename": canonical_filename,
                    "duplicate_filename": discovered.filename,
                },
            )
        )

    seen_keys: dict[tuple[str, str], int] = {}
    skipped_rows: list[int] = []
    duplicate_keys: list[dict] = []
    variant_map: dict[str, set[str]] = {}

    for row in raw_rows:
        normalize_row(row, discovered.platform, rates)

        if not row.campaign_raw:
            rejected.append(
                RejectedRow(row.row_num, "row_required_fields", "Missing campaign", row.raw)
            )
            continue
        if row.row_date is None:
            rejected.append(
                RejectedRow(row.row_num, "date_parseable", "Unparseable date", row.raw)
            )
            continue
        try:
            from datetime import date as date_cls

            date_cls(row.row_date.year, row.row_date.month, row.row_date.day)
        except ValueError:
            rejected.append(
                RejectedRow(
                    row.row_num,
                    "date_valid_calendar",
                    f"Invalid calendar date {row.row_date}",
                    row.raw,
                )
            )
            continue

        if row.spend_usd is None or row.impressions is None or row.clicks is None:
            rejected.append(
                RejectedRow(
                    row.row_num,
                    "row_required_fields",
                    "Missing spend, impressions, or clicks",
                    row.raw,
                )
            )
            continue
        if row.currency and row.currency not in rates:
            rejected.append(
                RejectedRow(
                    row.row_num,
                    "currency_known",
                    f"Unknown currency {row.currency}",
                    row.raw,
                )
            )
            continue
        if row.spend_usd < 0 or row.impressions < 0 or row.clicks < 0:
            rejected.append(
                RejectedRow(
                    row.row_num,
                    "numeric_non_negative",
                    "Negative numeric value",
                    row.raw,
                )
            )
            continue

        if not week_window_ok(row.row_date, discovered.week_start):
            checks.append(
                CheckResult(
                    "date_in_week_window",
                    "row",
                    "warn",
                    f"Row {row.row_num} date {row.row_date} outside week window",
                    {"row": row.row_num, "date": str(row.row_date)},
                )
            )

        med = spend_median(spend_history, discovered.platform, row.campaign_key or "")
        if med is not None and row.spend_usd > OUTLIER_MULTIPLIER * med:
            rejected.append(
                RejectedRow(
                    row.row_num,
                    "spend_outlier",
                    f"Spend {row.spend_usd:.2f} exceeds {OUTLIER_MULTIPLIER}× median {med:.2f}",
                    row.raw,
                )
            )
            continue

        key = (row.campaign_key or "", str(row.row_date))
        if key in seen_keys:
            skipped_rows.append(row.row_num)
            for dk in duplicate_keys:
                if dk["campaign_key"] == row.campaign_key and dk["date"] == str(row.row_date):
                    dk["rows"].append(row.row_num)
                    break
            else:
                duplicate_keys.append(
                    {
                        "campaign_key": row.campaign_key,
                        "date": str(row.row_date),
                        "rows": [seen_keys[key], row.row_num],
                    }
                )
            continue

        seen_keys[key] = row.row_num
        variant_map.setdefault(row.campaign_key or "", set()).add(row.campaign_raw)
        accepted.append(row)
        spend_history.setdefault((discovered.platform, row.campaign_key or ""), []).append(
            row.spend_usd
        )

    if skipped_rows:
        checks.append(
            CheckResult(
                "duplicate_rows",
                "file",
                "warn",
                f"{len(skipped_rows)} duplicate campaign-day rows skipped (kept first)",
                {
                    "duplicate_count": len(skipped_rows),
                    "skipped_rows": skipped_rows,
                    "duplicate_keys": duplicate_keys,
                },
            )
        )
    else:
        checks.append(
            CheckResult("duplicate_rows", "file", "pass", "No duplicate campaign-day rows")
        )

    variants = {k: v for k, v in variant_map.items() if len(v) > 1}
    if variants:
        checks.append(
            CheckResult(
                "campaign_name_variants",
                "file",
                "warn",
                "Multiple raw campaign names map to the same campaign_key",
                {"variants": {k: sorted(v) for k, v in variants.items()}},
            )
        )
    else:
        checks.append(
            CheckResult("campaign_name_variants", "file", "pass", "No campaign name variants")
        )

    distinct_dates = {r.row_date for r in accepted}
    if discovered.week_start.isoformat() == "2026-06-29":
        checks.append(
            CheckResult(
                "partial_week",
                "file",
                "warn",
                "Expected partial week (2 days only)",
                {"distinct_dates": len(distinct_dates)},
            )
        )
    elif len(distinct_dates) < 7:
        checks.append(
            CheckResult(
                "partial_week",
                "file",
                "warn",
                f"Only {len(distinct_dates)} distinct dates in week",
                {"distinct_dates": len(distinct_dates)},
            )
        )
    else:
        checks.append(CheckResult("partial_week", "file", "pass", "Full week coverage"))

    if is_duplicate_delivery:
        accepted = []

    health = classify_health(checks, rejected)
    return ProcessedFile(
        platform=discovered.platform,
        week_start=discovered.week_start,
        filename=discovered.filename,
        file_hash=file_hash(discovered.path),
        row_count_raw=len(raw_rows),
        accepted_rows=accepted,
        checks=checks,
        rejected_rows=rejected,
        health=health,
        is_canonical=not is_duplicate_delivery,
    )


def quality_report_dict(processed: ProcessedFile) -> dict:
    return {
        "summary": summarize_checks(processed.checks, processed.rejected_rows),
        "checks": [
            {
                "check_name": c.check_name,
                "level": c.level,
                "outcome": c.outcome,
                "message": c.message,
                "details": c.details,
            }
            for c in processed.checks
        ],
        "rejected_rows": [
            {
                "row": r.row,
                "reason": r.reason,
                "message": r.message,
                "raw": r.raw,
            }
            for r in processed.rejected_rows
        ],
    }
