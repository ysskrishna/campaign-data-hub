from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_ROOT / "data"
DELIVERIES_DIR = DATA_DIR / "deliveries"
EXCHANGE_RATES_PATH = DATA_DIR / "exchange_rates.json"
DATABASE_URL = f"sqlite:///{BACKEND_ROOT / 'campaign_hub.db'}"

PLATFORMS = ("meta_ads", "google_ads", "linkedin_ads")
EXPECTED_WEEKS = (
    "2026-06-01",
    "2026-06-08",
    "2026-06-15",
    "2026-06-22",
    "2026-06-29",
)
