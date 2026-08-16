import hashlib
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from app.config import DELIVERIES_DIR, PLATFORMS

FILENAME_RE = re.compile(
    r"^(meta_ads|google_ads|linkedin_ads)_(\d{4}-\d{2}-\d{2})(?:_resend)?\.(csv|json)$"
)


@dataclass
class DiscoveredFile:
    path: Path
    filename: str
    platform: str
    week_start: date
    is_resend: bool


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def discover_files(filename: str | None = None) -> list[DiscoveredFile]:
    if filename:
        path = DELIVERIES_DIR / filename
        if not path.exists():
            return []
        files = [path]
    else:
        files = sorted(DELIVERIES_DIR.iterdir())

    discovered: list[DiscoveredFile] = []
    for path in files:
        if not path.is_file():
            continue
        match = FILENAME_RE.match(path.name)
        if not match:
            continue
        platform, week_str, _ext = match.groups()
        if platform not in PLATFORMS:
            continue
        discovered.append(
            DiscoveredFile(
                path=path,
                filename=path.name,
                platform=platform,
                week_start=date.fromisoformat(week_str),
                is_resend="_resend" in path.name,
            )
        )

    return sorted(discovered, key=lambda f: f.filename)
