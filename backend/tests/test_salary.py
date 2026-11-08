from app.services.salary import to_annual, to_eur

# Test rates: how many units of each currency 1 EUR buys
RATES = {"PLN": 4.25, "CZK": 24.35}


def test_monthly_salary_becomes_yearly():
    assert to_annual(3000, "month") == 36000


def test_yearly_salary_stays_the_same():
    assert to_annual(45000, "year") == 45000


def test_hourly_rate_becomes_yearly():
    assert to_annual(20, "hour") == 41600


def test_missing_salary_stays_missing():
    assert to_annual(None, "month") is None


def test_unknown_period_gives_none():
    assert to_annual(3000, "decade") is None


def test_zloty_becomes_euro():
    assert to_eur(4250, "PLN", RATES) == 1000.0


def test_currency_code_in_lowercase_works_too():
    assert to_eur(4250, "pln", RATES) == 1000.0


def test_euro_stays_the_same():
    assert to_eur(45000, "EUR", RATES) == 45000


def test_result_is_rounded_to_cents():
    # 100 / 24.35 = 4.1067... -> 4.11
    assert to_eur(100, "CZK", RATES) == 4.11


def test_missing_amount_gives_none():
    assert to_eur(None, "PLN", RATES) is None


def test_unknown_currency_gives_none():
    assert to_eur(100, "XYZ", RATES) is None
