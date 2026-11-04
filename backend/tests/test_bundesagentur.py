from datetime import UTC, datetime, timedelta

import httpx
import pytest
import respx
from sqlalchemy import delete, select

from app.integrations.bundesagentur import (
    BA_PAGE_SIZE,
    BA_SEARCH_URL,
    fetch_ba_jobs,
    parse_ba_job,
    parse_ba_response,
)
from app.models import Vacancy
from app.services.vacancies import refresh_source

# A job as the board really returns it (fields we don't read are left out)
PNEUHAGE_JOB = {
    "stellenangebotsart": "ARBEIT",
    "stellenangebotsTitel": "Innendienstverkäufer (m/w/d)",
    "verguetungsangabe": "KEINE_ANGABEN",
    "stellenlokationen": [
        {
            "adresse": {
                "strasse": "Im Wendelrot",
                "plz": "76646",
                "ort": "Bruchsal",
                "region": "BADEN_WUERTTEMBERG",
                "land": "DEUTSCHLAND",
            },
            "breite": 49.137489,
            "laenge": 8.5715775,
        }
    ],
    "datumErsteVeroeffentlichung": "2026-11-04",
    "aenderungsdatum": "2026-11-04T18:50:29.960",
    "hauptberuf": "Kaufmann/-frau - Groß- und Außenhandel (Großhandel)",
    "firma": "Pneuhage Management GmbH & Co. KG",
    "referenznummer": "10001-1003964932-S",
}


def job(external_id: str = "1", days_old: int = 1, **fields) -> dict:
    day = (datetime.now(UTC) - timedelta(days=days_old)).strftime("%Y-%m-%d")
    return {
        "referenznummer": external_id,
        "stellenangebotsTitel": "Python Developer",
        "datumErsteVeroeffentlichung": day,
        **fields,
    }


def page_of(count: int, prefix: str = "job") -> httpx.Response:
    return httpx.Response(200, json={"ergebnisliste": [job(f"{prefix}-{i}") for i in range(count)]})


@pytest.fixture(autouse=True)
def no_real_pauses(monkeypatch):
    async def fake_sleep(seconds):
        pass

    monkeypatch.setattr("app.integrations.base.asyncio.sleep", fake_sleep)


def test_real_job_is_parsed():
    vacancy = parse_ba_job(PNEUHAGE_JOB)
    assert vacancy.source == "bundesagentur"
    assert vacancy.external_id == "10001-1003964932-S"
    assert vacancy.title == "Innendienstverkäufer (m/w/d)"
    assert vacancy.company == "Pneuhage Management GmbH & Co. KG"
    assert vacancy.country_code == "DE"
    assert vacancy.city == "Bruchsal"
    assert vacancy.url == "https://www.arbeitsagentur.de/jobsuche/jobdetail/10001-1003964932-S"
    assert vacancy.posted_at == datetime(2026, 11, 4, tzinfo=UTC)
    assert vacancy.remote is False
    assert len(vacancy.fingerprint) == 40


def test_home_office_means_remote():
    assert parse_ba_job(job(homeofficemoeglich=True)).remote is True


def test_job_without_a_location_has_no_city():
    assert parse_ba_job(job()).city is None


def test_occupation_is_used_when_the_title_says_nothing():
    vacancy = parse_ba_job(job(stellenangebotsTitel="Teamplayer gesucht", hauptberuf="Python Developer"))
    assert vacancy.industry == "it"


def test_title_comes_before_the_occupation():
    vacancy = parse_ba_job(job(hauptberuf="Koch/Köchin"))
    assert vacancy.industry == "it"


@pytest.mark.parametrize("field", ["referenznummer", "stellenangebotsTitel", "datumErsteVeroeffentlichung"])
def test_job_without_a_required_field_is_skipped(field):
    broken = job("broken")
    del broken[field]
    assert [v.external_id for v in parse_ba_response({"ergebnisliste": [broken, job("ok")]})] == ["ok"]


@pytest.mark.parametrize("date", [None, "yesterday"])
def test_job_with_a_bad_date_is_skipped(date):
    broken = job("broken", datumErsteVeroeffentlichung=date)
    assert [v.external_id for v in parse_ba_response({"ergebnisliste": [broken, job("ok")]})] == ["ok"]


def test_job_abroad_is_skipped():
    abroad = job("abroad", stellenlokationen=[{"adresse": {"ort": "Wien", "land": "OESTERREICH"}}])
    assert [v.external_id for v in parse_ba_response({"ergebnisliste": [abroad, job("ok")]})] == ["ok"]


def test_empty_response_gives_an_empty_list():
    assert parse_ba_response({}) == []
    assert parse_ba_response({"ergebnisliste": None}) == []


@respx.mock
async def test_request_sends_the_key_and_the_paging():
    route = respx.get(BA_SEARCH_URL).mock(return_value=page_of(1))

    async with httpx.AsyncClient() as client:
        await fetch_ba_jobs(client)

    request = route.calls.last.request
    assert request.headers["X-API-Key"] == "jobboerse-jobsuche"
    assert request.url.params["page"] == "1"
    assert request.url.params["size"] == str(BA_PAGE_SIZE)
    assert request.url.params["veroeffentlichtseit"] == "30"


@respx.mock
async def test_collects_pages_until_a_short_one():
    route = respx.get(BA_SEARCH_URL).mock(side_effect=[page_of(BA_PAGE_SIZE, "a"), page_of(2, "b")])

    async with httpx.AsyncClient() as client:
        vacancies = await fetch_ba_jobs(client)

    assert route.call_count == 2
    assert len(vacancies) == BA_PAGE_SIZE + 2


@respx.mock
async def test_stops_at_max_pages():
    route = respx.get(BA_SEARCH_URL).mock(return_value=page_of(BA_PAGE_SIZE))

    async with httpx.AsyncClient() as client:
        await fetch_ba_jobs(client, max_pages=2)

    assert route.call_count == 2


@respx.mock
async def test_old_jobs_are_dropped_even_if_the_board_returns_them():
    data = {"ergebnisliste": [job("fresh", days_old=29), job("old", days_old=32)]}
    respx.get(BA_SEARCH_URL).mock(return_value=httpx.Response(200, json=data))

    async with httpx.AsyncClient() as client:
        vacancies = await fetch_ba_jobs(client)

    assert [v.external_id for v in vacancies] == ["fresh"]


@respx.mock
async def test_refresh_saves_the_jobs(session):
    await session.execute(delete(Vacancy))
    await session.commit()
    data = {"ergebnisliste": [job("a", firma="Bosch"), job("b", firma="Bosch")]}
    respx.get(BA_SEARCH_URL).mock(return_value=httpx.Response(200, json=data))

    async with httpx.AsyncClient() as client:
        result = await refresh_source(session, client, "bundesagentur")

    rows = list(await session.scalars(select(Vacancy)))
    assert result.inserted == 1  # same title and company, no city: the second is a duplicate
    assert result.skipped == 1
    assert rows[0].source == "bundesagentur"


@respx.mock
async def test_refresh_reports_a_failure_by_source_name(session):
    respx.get(BA_SEARCH_URL).mock(return_value=httpx.Response(403))

    async with httpx.AsyncClient() as client:
        result = await refresh_source(session, client, "bundesagentur")

    assert result.failed == ["bundesagentur"]
    assert result.inserted == 0


@pytest.mark.parametrize(
    "fields",
    [
        {"stellenangebotsTitel": None},
        {"stellenlokationen": ["not an object"]},
        {"stellenlokationen": "not a list"},
    ],
)
def test_malformed_job_is_skipped_and_the_rest_are_kept(fields):
    data = {"ergebnisliste": [job("first"), job("broken", **fields), job("last")]}
    assert [v.external_id for v in parse_ba_response(data)] == ["first", "last"]


@respx.mock
async def test_refresh_reports_a_page_that_is_not_json_as_a_failure(session):
    respx.get(BA_SEARCH_URL).mock(return_value=httpx.Response(200, text="<html>maintenance</html>"))

    async with httpx.AsyncClient() as client:
        result = await refresh_source(session, client, "bundesagentur")

    assert result.failed == ["bundesagentur"]


def test_training_place_without_a_title_uses_the_occupation():
    broken = job("training", hauptberuf="Zahnmedizinische/r Fachangestellte/r")
    del broken["stellenangebotsTitel"]
    assert parse_ba_job(broken).title == "Zahnmedizinische/r Fachangestellte/r"
