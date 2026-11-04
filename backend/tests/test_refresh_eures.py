import json
from datetime import UTC, datetime, timedelta

import httpx
import pytest
import respx
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from app.integrations.bundesagentur import BA_SEARCH_URL
from app.integrations.cv import CV_EE, CV_LT, CV_LV
from app.integrations.ecb import ECB_RATES_URL
from app.integrations.esco import ESCO_OCCUPATION_URL
from app.integrations.eures import EURES_SEARCH_URL
from app.integrations.jobtech import JT_SEARCH_URL
from app.integrations.justjoin import JJ_SEARCH_URL
from app.models import ApiCache, Vacancy
from app.services.vacancies import refresh_all, refresh_eures


def eures_answer(request: httpx.Request) -> httpx.Response:
    """A fake EURES: one job per country, except that Malta is down."""
    code = json.loads(request.content)["locationCodes"][0]
    if code == "mt":
        return httpx.Response(500)
    created = int((datetime.now(UTC) - timedelta(days=1)).timestamp() * 1000)
    job = {"id": f"job-{code}", "title": "Python Developer", "creationDate": created}
    return httpx.Response(200, json={"jvs": [job]})


@pytest.fixture(autouse=True)
async def empty_vacancies(session):
    await session.execute(delete(Vacancy))
    await session.execute(delete(ApiCache))
    await session.commit()


@pytest.fixture(autouse=True)
def pauses(monkeypatch):
    recorded = []

    async def fake_sleep(seconds):
        recorded.append(seconds)

    monkeypatch.setattr("app.services.vacancies.asyncio.sleep", fake_sleep)
    return recorded


def mock_small_boards() -> None:
    """Every other outside service, answering with nothing to save."""
    respx.get(ECB_RATES_URL).mock(return_value=httpx.Response(200, text="<a/>"))
    for site in (CV_EE, CV_LT, CV_LV):
        respx.get(site.search_url).mock(return_value=httpx.Response(200, json={"vacancies": []}))
    respx.get(JJ_SEARCH_URL).mock(return_value=httpx.Response(200, json={"data": []}))
    respx.get(JT_SEARCH_URL).mock(return_value=httpx.Response(200, json={"hits": []}))


async def saved_countries(session) -> list[str]:
    return list(await session.scalars(select(Vacancy.country_code).order_by(Vacancy.country_code)))


@respx.mock
async def test_saves_jobs_of_the_chosen_countries(session):
    respx.post(EURES_SEARCH_URL).mock(side_effect=eures_answer)

    async with httpx.AsyncClient() as client:
        result = await refresh_eures(session, client, ["PL", "GR"])

    assert result.inserted == 2
    assert await saved_countries(session) == ["GR", "PL"]


@respx.mock
async def test_no_codes_means_all_27_countries(session):
    route = respx.post(EURES_SEARCH_URL).mock(side_effect=eures_answer)

    async with httpx.AsyncClient() as client:
        result = await refresh_eures(session, client)

    assert route.call_count == 27
    assert result.inserted == 26
    assert result.failed == ["MT"]


@respx.mock
async def test_failed_country_does_not_stop_the_others(session):
    respx.post(EURES_SEARCH_URL).mock(side_effect=eures_answer)

    async with httpx.AsyncClient() as client:
        result = await refresh_eures(session, client, ["DE", "MT", "PL"])

    assert result.failed == ["MT"]
    assert await saved_countries(session) == ["DE", "PL"]


@respx.mock
async def test_network_error_counts_as_a_failed_country(session):
    respx.post(EURES_SEARCH_URL).mock(side_effect=httpx.ConnectTimeout("no answer"))

    async with httpx.AsyncClient() as client:
        result = await refresh_eures(session, client, ["PL"])

    assert result.failed == ["PL"]
    assert result.inserted == 0


@respx.mock
async def test_second_run_updates_instead_of_inserting(session):
    respx.post(EURES_SEARCH_URL).mock(side_effect=eures_answer)

    async with httpx.AsyncClient() as client:
        await refresh_eures(session, client, ["PL"])
        result = await refresh_eures(session, client, ["PL"])

    assert result.inserted == 0
    assert result.updated == 1


@respx.mock
async def test_pauses_only_between_countries(session, pauses):
    respx.post(EURES_SEARCH_URL).mock(side_effect=eures_answer)

    async with httpx.AsyncClient() as client:
        await refresh_eures(session, client, ["DE", "PL", "GR"], pause_seconds=0.5)

    assert pauses == [0.5, 0.5]


@respx.mock
async def test_unknown_country_code_requests_nothing(session):
    route = respx.post(EURES_SEARCH_URL).mock(side_effect=eures_answer)

    async with httpx.AsyncClient() as client:
        result = await refresh_eures(session, client, ["XX"])

    assert route.call_count == 0
    assert result.inserted == 0


@respx.mock
async def test_industry_of_a_saved_job_comes_from_its_occupation(session):
    uri = "http://data.europa.eu/esco/occupation/refresh-test"
    created = int((datetime.now(UTC) - timedelta(days=1)).timestamp() * 1000)
    job = {"id": "occ", "title": "Księgowy", "creationDate": created, "jobCategoriesCodes": [uri]}
    respx.post(EURES_SEARCH_URL).mock(return_value=httpx.Response(200, json={"jvs": [job]}))
    respx.get(ESCO_OCCUPATION_URL).mock(return_value=httpx.Response(200, json={"code": "3313.2"}))

    async with httpx.AsyncClient() as client:
        await refresh_eures(session, client, ["PL"])

    row = await session.scalar(select(Vacancy).options(selectinload(Vacancy.industry)))
    assert row.industry.slug == "finance"


@respx.mock
async def test_page_that_is_not_json_fails_one_country_and_the_others_continue(session):
    def answer(request: httpx.Request) -> httpx.Response:
        if json.loads(request.content)["locationCodes"] == ["mt"]:
            return httpx.Response(200, text="<html>maintenance</html>")
        return eures_answer(request)

    respx.post(EURES_SEARCH_URL).mock(side_effect=answer)

    async with httpx.AsyncClient() as client:
        result = await refresh_eures(session, client, ["DE", "MT", "PL"])

    assert result.failed == ["MT"]
    assert await saved_countries(session) == ["DE", "PL"]


@respx.mock
async def test_refresh_all_reads_national_boards_before_eures(session):
    calls = []

    def eures(request: httpx.Request) -> httpx.Response:
        calls.append("eures")
        return eures_answer(request)

    def board(request: httpx.Request) -> httpx.Response:
        calls.append("board")
        return httpx.Response(200, json={"ergebnisliste": []})

    respx.post(EURES_SEARCH_URL).mock(side_effect=eures)
    mock_small_boards()
    respx.get(BA_SEARCH_URL).mock(side_effect=board)

    async with httpx.AsyncClient() as client:
        result = await refresh_all(session, client)

    assert calls[0] == "board"
    assert calls.count("eures") == 27
    assert result.inserted == 26
    assert result.failed == ["MT"]


@respx.mock
async def test_refresh_all_carries_on_when_a_board_fails(session):
    respx.post(EURES_SEARCH_URL).mock(side_effect=eures_answer)
    mock_small_boards()
    respx.get(BA_SEARCH_URL).mock(return_value=httpx.Response(503))

    async with httpx.AsyncClient() as client:
        result = await refresh_all(session, client)

    assert result.failed == ["bundesagentur", "MT"]
    assert result.inserted == 26
