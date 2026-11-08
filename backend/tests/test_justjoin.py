from datetime import UTC, datetime, timedelta

import httpx
import pytest
import respx

from app.integrations.base import annual_min_eur
from app.integrations.justjoin import JJ_SEARCH_URL, fetch_jj_jobs, parse_jj_job, parse_jj_response

CONVERTED = {
    "from": 2136.0, "fromPerUnit": 2136.0, "to": 2849.0, "toPerUnit": 2849.0,
    "currency": "EUR", "type": "b2b", "unit": "Month", "currencySource": "conversion",
}
ORIGINAL = {
    "from": 9450.0, "fromPerUnit": 9450.0, "to": 12600.0, "toPerUnit": 12600.0,
    "currency": "PLN", "type": "b2b", "unit": "Month", "currencySource": "original",
}
HOURLY = {
    "from": 2856.0, "fromPerUnit": 17.0, "to": 5880.0, "toPerUnit": 35.0,
    "currency": "USD", "type": "b2b", "unit": "Hour", "currencySource": "original",
}
NO_AMOUNT = {
    "from": None, "fromPerUnit": None, "to": None, "toPerUnit": None,
    "currency": "GBP", "type": "permanent", "unit": "month", "currencySource": "conversion",
}

# An offer as the board really returns it (shortened)
REAL_JOB = {
    "guid": "4479a999-4f56-48de-b2d8-0c0f436daaf4",
    "slug": "telewizja-polska-administrator-sap-fico-m-k--warszawa-erp-ecbc3932",
    "title": "Administrator SAP FICO (m/k)",
    "workplaceType": "hybrid",
    "category": {"key": "erp", "parentKey": None},
    "city": "Warszawa",
    "companyName": "Telewizja Polska",
    "publishedAt": "2026-11-05T09:22:45.378Z",
    "employmentTypes": [NO_AMOUNT],
}


def test_real_job_is_parsed():
    vacancy = parse_jj_job(REAL_JOB)
    assert vacancy.source == "justjoin"
    assert vacancy.external_id == "4479a999-4f56-48de-b2d8-0c0f436daaf4"
    assert vacancy.title == "Administrator SAP FICO (m/k)"
    assert vacancy.company == "Telewizja Polska"
    assert (vacancy.country_code, vacancy.city) == ("PL", "Warszawa")
    assert vacancy.url == "https://justjoin.it/job-offer/" + REAL_JOB["slug"]
    assert vacancy.posted_at == datetime(2026, 11, 5, 9, 22, 45, 378000, tzinfo=UTC)
    assert vacancy.industry == "it"
    assert vacancy.remote is False


def test_salary_in_the_employers_currency_is_used_not_a_conversion():
    vacancy = parse_jj_job({**REAL_JOB, "employmentTypes": [CONVERTED, ORIGINAL]})
    assert (vacancy.salary_min, vacancy.salary_max, vacancy.salary_currency) == (9450.0, 12600.0, "PLN")


def test_period_is_lowercased_for_our_salary_helpers():
    assert parse_jj_job({**REAL_JOB, "employmentTypes": [ORIGINAL]}).salary_period == "month"


def test_hourly_rate_is_read_per_hour_not_scaled_to_a_month():
    vacancy = parse_jj_job({**REAL_JOB, "employmentTypes": [HOURLY]})
    assert (vacancy.salary_min, vacancy.salary_max) == (17.0, 35.0)
    assert vacancy.salary_period == "hour"
    assert annual_min_eur(vacancy, {"USD": 1.0}) == 35360


def test_no_amount_means_no_salary():
    vacancy = parse_jj_job(REAL_JOB)
    assert vacancy.salary_min is None
    assert vacancy.salary_currency is None
    assert vacancy.salary_period is None


def test_remote():
    assert parse_jj_job({**REAL_JOB, "workplaceType": "remote"}).remote is True


def test_non_it_category():
    assert parse_jj_job({**REAL_JOB, "category": {"key": "sales"}}).industry == "sales"


def test_category_other_is_guessed_from_the_title():
    job = {**REAL_JOB, "title": "Buchhalter", "category": {"key": "other"}}
    assert parse_jj_job(job).industry == "finance"


@pytest.mark.parametrize("field", ["guid", "slug", "title", "publishedAt"])
def test_broken_offer_is_skipped(field):
    broken = {key: value for key, value in REAL_JOB.items() if key != field}
    assert len(parse_jj_response({"data": [broken, REAL_JOB]})) == 1


@respx.mock
async def test_old_offers_are_dropped_and_the_request_has_the_paging():
    fresh = {**REAL_JOB, "publishedAt": datetime.now(UTC).isoformat()}
    old = {**REAL_JOB, "guid": "old", "publishedAt": (datetime.now(UTC) - timedelta(days=40)).isoformat()}
    route = respx.get(JJ_SEARCH_URL).mock(return_value=httpx.Response(200, json={"data": [fresh, old]}))

    async with httpx.AsyncClient() as client:
        vacancies = await fetch_jj_jobs(client)

    assert [v.external_id for v in vacancies] == [REAL_JOB["guid"]]
    assert route.calls.last.request.url.params["from"] == "0"
