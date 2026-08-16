from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Delivery(Base):
    __tablename__ = "deliveries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    platform: Mapped[str] = mapped_column(String, nullable=False)
    week_start: Mapped[date] = mapped_column(Date, nullable=False)
    filename: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    file_hash: Mapped[str] = mapped_column(String, nullable=False)
    ingested_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    health: Mapped[str] = mapped_column(String, nullable=False)
    is_canonical: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    row_count_raw: Mapped[int] = mapped_column(Integer, nullable=False)
    row_count_accepted: Mapped[int] = mapped_column(Integer, nullable=False)
    quality_report: Mapped[str] = mapped_column(Text, nullable=False)

    metrics: Mapped[list["CampaignMetric"]] = relationship(
        back_populates="delivery", cascade="all, delete-orphan"
    )


class CampaignMetric(Base):
    __tablename__ = "campaign_metrics"
    __table_args__ = (
        UniqueConstraint("delivery_id", "campaign_key", "date", name="uq_metric_delivery_campaign_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    delivery_id: Mapped[int] = mapped_column(ForeignKey("deliveries.id", ondelete="CASCADE"), nullable=False)
    platform: Mapped[str] = mapped_column(String, nullable=False)
    campaign: Mapped[str] = mapped_column(String, nullable=False)
    campaign_key: Mapped[str] = mapped_column(String, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    spend_usd: Mapped[float] = mapped_column(Float, nullable=False)
    impressions: Mapped[int] = mapped_column(Integer, nullable=False)
    clicks: Mapped[int] = mapped_column(Integer, nullable=False)

    delivery: Mapped["Delivery"] = relationship(back_populates="metrics")
