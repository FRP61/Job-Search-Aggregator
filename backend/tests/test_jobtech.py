from datetime import UTC, datetime, timedelta

import httpx
import pytest
import respx

from app.integrations.jobtech import JT_SEARCH_URL, fetch_jt_jobs, parse_jt_job, parse_jt_response

# A job as the board really returns it (shortened)
REAL_JOB = {
    "id": "31686831",
    "headline": "Lärare i musik för åk 7-9",
    "webpage_url": "https://arbetsformedlingen.se/platsbanken/annonser/31686831",
    "description": {"text": "Vi söker en lärare"},
    "employer": {"name": "Lärocentrum i Skara Ekonomisk förening", "workplace": "Friskolan Metis"},
    "occupation_field": {"label": "Pedagogik"},
    "workplace_model": {"label": "Arbete på plats"},
    "workplace_address": {"municipality": "Skara", "city": "Skara", "country": "Sverige"},
    "publication_date": "2026-11-04T19:19:35",
    "removed": False,
}


def test_real_job_is_parsed():
    vacancy = parse_jt_job(REAL_JOB)
    assert vacancy.source == "jobtech"
    assert vacancy.external_id == "31686831"
    assert vacancy.title == "Lärare i musik för åk 7-9"
    assert vacancy.company == "Lärocentrum i Skara Ekonomisk förening"
    assert (vacancy.country_code, vacancy.city) == ("SE", "Skara")
    assert vacancy.url == REAL_JOB["webpage_url"]
    assert vacancy.posted_at == datetime(2026, 11, 4, 19, 19, 35, tzinfo=UTC)
    assert vacancy.industry == "education"
    assert vacancy.description == "Vi söker en lärare"
    assert vacancy.remote is False


def test_city_falls_back_to_the_municipality():
    address = {"municipality": "Skara", "city": None, "country": "Sverige"}
    assert parse_jt_job({**REAL_JOB, "workplace_address": address}).city == "Skara"


def test_remote_model():
    assert parse_jt_job({**REAL_JOB, "workplace_model": {"label": "Arbete på distans"}}).remote is True


def test_unknown_field_falls_back_to_the_title():
    job = {**REAL_JOB, "headline": "Python Developer", "occupation_field": {"label": "Naturbruk"}}
    assert parse_jt_job(job).industry == "it"


def test_removed_and_foreign_jobs_are_skipped():
    removed = {**REAL_JOB, "id": "removed", "removed": True}
    foreign = {**REAL_JOB, "id": "foreign", "workplace_address": {"country": "Norge"}}
    assert [v.external_id for v in parse_jt_response({"hits": [removed, foreign, REAL_JOB]})] == ["31686831"]


@pytest.mark.parametrize("field", ["id", "headline", "webpage_url", "publication_date"])
def test_broken_job_is_skipped(field):
    broken = {key: value for key, value in REAL_JOB.items() if key != field}
    assert len(parse_jt_response({"hits": [broken, REAL_JOB]})) == 1


@respx.mock
async def test_request_asks_for_the_newest_of_the_month_and_drops_older_jobs():
    now = datetime.now(UTC).replace(tzinfo=None)
    fresh = {**REAL_JOB, "publication_date": now.isoformat()}
    old = {**REAL_JOB, "id": "old", "publication_date": (now - timedelta(days=40)).isoformat()}
    route = respx.get(JT_SEARCH_URL).mock(return_value=httpx.Response(200, json={"hits": [fresh, old]}))

    async with httpx.AsyncClient() as client:
        vacancies = await fetch_jt_jobs(client)

    params = route.calls.last.request.url.params
    assert (params["sort"], params["published-after"]) == ("pubdate-desc", "43200")
    assert [v.external_id for v in vacancies] == ["31686831"]
