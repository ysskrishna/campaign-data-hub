import csv
import json
from pathlib import Path

from app.pipeline.types import RawRow


def parse_meta(path: Path) -> tuple[list[RawRow], str | None]:
    rows: list[RawRow] = []
    try:
        with path.open(newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            if not reader.fieldnames:
                return [], "Missing header row"
            for i, record in enumerate(reader, start=2):
                rows.append(RawRow(row_num=i, raw=dict(record)))
    except (OSError, csv.Error) as e:
        return [], str(e)
    return rows, None


def parse_google(path: Path) -> tuple[list[RawRow], str | None]:
    rows: list[RawRow] = []
    try:
        with path.open(newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            if not reader.fieldnames:
                return [], "Missing header row"
            for i, record in enumerate(reader, start=2):
                rows.append(RawRow(row_num=i, raw=dict(record)))
    except (OSError, csv.Error) as e:
        return [], str(e)
    return rows, None


def parse_linkedin(path: Path) -> tuple[list[RawRow], str | None]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            return [], "Expected JSON array"
        rows = [RawRow(row_num=i + 1, raw=item) for i, item in enumerate(data)]
        return rows, None
    except (OSError, json.JSONDecodeError) as e:
        return [], str(e)
