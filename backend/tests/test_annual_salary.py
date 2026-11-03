from app.integrations.base import NormalizedVacancy, annual_max_eur, annual_min_eur

RATES = {"PLN": 4.0}


def make_vacancy(salary_min, salary_period, salary_currency):
    return NormalizedVacancy(
        source="test",
        external_id="1",
        title="Python Developer",
        url="https://example.com/1",
        country_code="PL",
        salary_min=salary_min,
        salary_period=salary_period,
        salary_currency=salary_currency,
    )


def test_monthly_euro_salary_becomes_annual():
    vacancy = make_vacancy(3000, "month", "EUR")
    assert annual_min_eur(vacancy, RATES) == 36000


def test_monthly_zloty_salary_becomes_annual_euros():
    # 5000 * 12 = 60000 PLN, and 60000 / 4.0 = 15000 EUR
    vacancy = make_vacancy(5000, "month", "PLN")
    assert annual_min_eur(vacancy, RATES) == 15000


def test_vacancy_without_salary_gives_none():
    vacancy = make_vacancy(None, None, None)
    assert annual_min_eur(vacancy, RATES) is None


def test_unknown_period_gives_none():
    vacancy = make_vacancy(3000, "decade", "EUR")
    assert annual_min_eur(vacancy, RATES) is None


def test_unknown_currency_gives_none():
    vacancy = make_vacancy(3000, "month", "XYZ")
    assert annual_min_eur(vacancy, RATES) is None


def test_salary_without_currency_gives_none():
    # Some boards give an amount but no currency: we can't convert it
    vacancy = make_vacancy(3000, "month", None)
    assert annual_min_eur(vacancy, RATES) is None


def test_max_uses_salary_max_not_salary_min():
    vacancy = make_vacancy(1000, "month", "PLN")
    vacancy.salary_max = 6000
    assert annual_max_eur(vacancy, RATES) == 18000


def test_max_without_salary_max_gives_none():
    vacancy = make_vacancy(1000, "month", "PLN")
    assert annual_max_eur(vacancy, RATES) is None


def test_max_without_currency_gives_none():
    vacancy = make_vacancy(1000, "month", None)
    vacancy.salary_max = 6000
    assert annual_max_eur(vacancy, RATES) is None
