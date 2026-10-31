from app.services.salary import to_annual


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
