from datetime import date, datetime

from dateutil import parser as date_parser


def campaign_key(name: str) -> str:
    return name.strip().casefold()


def parse_date(value: str | int | float | None, week_start: date | None = None) -> date | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value / 1000).date()
        except (OSError, OverflowError, ValueError):
            return None
    text = str(value).strip()
    if not text:
        return None
    if len(text) == 10 and text[4] == "-" and text[7] == "-":
        try:
            return date.fromisoformat(text)
        except ValueError:
            return None
    if "/" in text:
        parts = text.split("/")
        if len(parts) == 3:
            try:
                month, day, year = int(parts[0]), int(parts[1]), int(parts[2])
                return date(year, month, day)
            except (ValueError, OverflowError):
                return None
    try:
        parsed = date_parser.parse(text, dayfirst=False)
        return parsed.date()
    except (ValueError, TypeError, OverflowError):
        return None


def week_window_ok(row_date: date, week_start: date) -> bool:
    from datetime import timedelta

    end = week_start + timedelta(days=6)
    return week_start <= row_date <= end


def safe_float(value: str | float | int | None) -> float | None:
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def safe_int(value: str | float | int | None) -> int | None:
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None
