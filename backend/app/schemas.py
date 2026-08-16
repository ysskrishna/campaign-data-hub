from datetime import date, datetime
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ApiResponse(BaseModel, Generic[T]):
    data: T | None = None
    meta: dict[str, Any] = Field(default_factory=dict)
    error: ErrorDetail | None = None


class IngestRequest(BaseModel):
    filename: str | None = None


class IngestDeliverySummary(BaseModel):
    filename: str
    health: str
    row_count_accepted: int
    is_canonical: bool


class IngestResult(BaseModel):
    mode: Literal["all", "file"]
    files_discovered: int
    files_processed: int
    canonical_deliveries: int
    skipped_duplicate_files: int
    health_counts: dict[str, int]
    deliveries: list[IngestDeliverySummary]
    cadence_gaps: list[str] = Field(default_factory=list)
    duration_ms: int


class CampaignMetricsRow(BaseModel):
    campaign: str
    platform: str
    spend_usd: float
    impressions: int
    clicks: int
    ctr: float | None
    cpc: float | None


class MetricsSummary(BaseModel):
    spend_usd: float
    impressions: int
    clicks: int
    ctr: float | None
    cpc: float | None


class PlatformMetrics(BaseModel):
    platform: str
    spend_usd: float
    impressions: int
    clicks: int
    ctr: float | None
    cpc: float | None


class DeliveryListItem(BaseModel):
    id: int
    platform: str
    week_start: date
    filename: str
    health: str
    is_canonical: bool
    row_count_raw: int
    row_count_accepted: int
    ingested_at: datetime


class DeliveryDetail(DeliveryListItem):
    quality_summary: dict[str, int]


class HealthStatus(BaseModel):
    status: str
