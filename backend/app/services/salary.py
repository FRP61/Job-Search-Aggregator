"""Salary helpers: turn salaries from different job boards into one comparable number."""
# How many times each pay period fits into one working year
PERIODS_PER_YEAR = {
    "year": 1,
    "month": 12,
    "week": 52,
    "day": 220,  # about 220 working days in a year
    "hour": 2080,  # 40 hours a week * 52 weeks
}


def to_annual(amount: float | None, period: str) -> float | None:
    """Convert a salary paid per `period` into a salary per year.

    to_annual(3000, "month")  -> 36000
    to_annual(20, "hour")     -> 41600
    to_annual(None, "month")  -> None   (the vacancy has no salary)
    to_annual(3000, "decade") -> None   (we don't know this period)
    """
    if amount is None:
        return None
    factor = PERIODS_PER_YEAR.get(period)
    if factor is None:
        return None
    return amount * factor
