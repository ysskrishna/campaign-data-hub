from dataclasses import dataclass, field
from datetime import date as DateType


@dataclass
class RawRow:
    row_num: int
    raw: dict
    campaign_raw: str | None = None
    campaign_key: str | None = None
    campaign_display: str | None = None
    row_date: DateType | None = None
    spend_usd: float | None = None
    impressions: int | None = None
    clicks: int | None = None
    currency: str | None = None


@dataclass
class CheckResult:
    check_name: str
    level: str
    outcome: str
    message: str
    details: dict = field(default_factory=dict)


@dataclass
class RejectedRow:
    row: int
    reason: str
    message: str
    raw: dict


@dataclass
class ProcessedFile:
    platform: str
    week_start: DateType
    filename: str
    file_hash: str
    row_count_raw: int
    accepted_rows: list[RawRow]
    checks: list[CheckResult]
    rejected_rows: list[RejectedRow]
    health: str
    is_canonical: bool = True
