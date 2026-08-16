def classify_health(checks: list, rejected_rows: list) -> str:
    if rejected_rows:
        return "fail"
    for check in checks:
        if check.level == "file" and check.outcome == "fail":
            return "fail"
    for check in checks:
        if check.outcome == "warn":
            return "warn"
    return "pass"


def summarize_checks(checks: list, rejected_rows: list) -> dict[str, int]:
    counts = {"pass": 0, "warn": 0, "fail": 0}
    for check in checks:
        counts[check.outcome] = counts.get(check.outcome, 0) + 1
    if rejected_rows:
        counts["fail"] = counts.get("fail", 0) + len(rejected_rows)
    return counts
