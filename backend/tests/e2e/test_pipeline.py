import json
import shutil
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_db
from app.main import app
from app.models import CampaignMetric, Delivery

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
SOURCE_DATA = BACKEND_ROOT / "data"


@pytest.fixture()
def client():
    tmp = tempfile.mkdtemp()
    data_dir = Path(tmp) / "data"
    shutil.copytree(SOURCE_DATA, data_dir)

    db_path = Path(tmp) / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    import app.config as config
    import app.pipeline.discover as discover_mod
    import app.pipeline.process as process_mod

    config.DATA_DIR = data_dir
    config.DELIVERIES_DIR = data_dir / "deliveries"
    config.EXCHANGE_RATES_PATH = data_dir / "exchange_rates.json"
    discover_mod.DELIVERIES_DIR = config.DELIVERIES_DIR
    process_mod.EXCHANGE_RATES_PATH = config.EXCHANGE_RATES_PATH

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c, TestingSessionLocal
    app.dependency_overrides.clear()
    shutil.rmtree(tmp)


def ingest_all(client_tuple):
    client, _ = client_tuple
    return client.post("/api/v1/ingest", json={})


def metric_totals(session_factory):
    db = session_factory()
    rows = db.query(CampaignMetric).all()
    spend = sum(r.spend_usd for r in rows)
    db.close()
    return len(rows), spend


def test_full_ingest(client):
    c, session_factory = client
    resp = ingest_all(client)
    assert resp.status_code == 200
    body = resp.json()
    assert body["error"] is None
    assert body["data"]["files_discovered"] == 15
    assert body["data"]["canonical_deliveries"] == 14
    count, spend = metric_totals(session_factory)
    assert count > 0
    assert spend > 0


def test_idempotency(client):
    ingest_all(client)
    session_factory = client[1]
    c1, s1 = metric_totals(session_factory)
    ingest_all(client)
    c2, s2 = metric_totals(session_factory)
    assert c1 == c2
    assert s1 == s2


def test_resend_duplicate(client):
    c, session_factory = client
    ingest_all(client)
    db = session_factory()
    resend = db.query(Delivery).filter(Delivery.filename == "google_ads_2026-06-15_resend.csv").one()
    canonical = db.query(Delivery).filter(Delivery.filename == "google_ads_2026-06-15.csv").one()
    assert resend.is_canonical is False
    assert canonical.is_canonical is True
    report = json.loads(resend.quality_report)
    names = [ch["check_name"] for ch in report["checks"]]
    assert "duplicate_delivery" in names
    google_metrics = db.query(CampaignMetric).filter(CampaignMetric.platform == "google_ads").count()
    db.close()
    ingest_all(client)
    db = session_factory()
    assert db.query(CampaignMetric).filter(CampaignMetric.platform == "google_ads").count() == google_metrics
    db.close()


def test_row_rejection_invalid_date(client):
    session_factory = client[1]
    ingest_all(client)
    db = session_factory()
    delivery = db.query(Delivery).filter(Delivery.filename == "meta_ads_2026-06-01.csv").one()
    report = json.loads(delivery.quality_report)
    rejected = report["rejected_rows"]
    assert any(
        r["row"] == 23 and r["reason"] in ("date_valid_calendar", "date_parseable")
        for r in rejected
    )
    bad_rows = (
        db.query(CampaignMetric)
        .join(Delivery)
        .filter(Delivery.filename == "meta_ads_2026-06-01.csv")
        .count()
    )
    assert bad_rows == delivery.row_count_accepted
    assert delivery.row_count_accepted < delivery.row_count_raw
    db.close()


def test_campaign_normalization(client):
    c, session_factory = client
    ingest_all(client)
    db = session_factory()
    keys = (
        db.query(CampaignMetric.campaign_key)
        .filter(CampaignMetric.platform == "meta_ads")
        .filter(CampaignMetric.campaign_key == "brand awareness q2")
        .count()
    )
    db.close()
    assert keys > 0
    resp = c.get("/api/v1/metrics/campaigns", params={"platform": "meta_ads"})
    rows = resp.json()["data"]["rows"]
    brand_rows = [r for r in rows if "brand awareness" in r["campaign"].casefold()]
    assert len(brand_rows) == 1


def test_metrics_api_filters_and_null_derived(client):
    c, _ = client
    ingest_all(client)
    full = c.get("/api/v1/metrics/summary").json()["data"]
    filtered = c.get(
        "/api/v1/metrics/summary",
        params={"start_date": "2026-06-29", "end_date": "2026-06-30"},
    ).json()["data"]
    assert filtered["spend_usd"] < full["spend_usd"]
    resp = c.get("/api/v1/metrics/campaigns")
    rows = resp.json()["data"]["rows"]
    zero_click = next((r for r in rows if r["clicks"] == 0), None)
    if zero_click:
        assert zero_click["ctr"] is None
        assert zero_click["cpc"] is None
