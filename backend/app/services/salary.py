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


def to_eur(amount: float | None, currency: str, rates: dict[str, float]) -> float | None:
    """Convert an amount in `currency` into euros, rounded to cents.

    `rates` says how many units of a currency one euro buys, like the
    European Central Bank publishes them: {"PLN": 4.25} means 1 EUR = 4.25 PLN.

    to_eur(4250, "PLN", {"PLN": 4.25})  -> 1000.0
    to_eur(4250, "pln", {"PLN": 4.25})  -> 1000.0   (boards write currency in any case)
    to_eur(45000, "EUR", {"PLN": 4.25}) -> 45000    (euro needs no conversion)
    to_eur(None, "PLN", {"PLN": 4.25})  -> None     (no salary)
    to_eur(100, "XYZ", {"PLN": 4.25})   -> None     (we don't know this currency)
    """

    if amount is None:
        return None
    currency = currency.upper()

    if currency == "EUR":
        return round(amount, 2)
    rate = rates.get(currency)

    if rate is None:
        return None
    return round(amount / rate, 2)
