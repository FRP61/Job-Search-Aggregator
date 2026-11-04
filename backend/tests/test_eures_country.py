import json
from datetime import UTC, datetime, timedelta

import httpx
import pytest
import respx

from app.integrations.eures import EURES_PAGE_SIZE, EURES_SEARCH_URL, fetch_eures_country


def days_ago_ms(days: int) -> int:
    """A date `days` days ago, in the milliseconds EURES uses."""
    return int((datetime.now(UTC) - timedelta(days=days)).timestamp() * 1000)


@pytest.fixture(autouse=True)
def pauses(monkeypatch):
    """Record pauses instead of really waiting, so the tests stay fast."""
    recorded = []

    async def fake_sleep(seconds):
        recorded.append(seconds)

    monkeypatch.setattr("app.integrations.eures.asyncio.sleep", fake_sleep)
    return recorded


def page_of(count: int, prefix: str = "job") -> httpx.Response:
    """A fake EURES response with `count` jobs."""
    jobs = [
        {"id": f"{prefix}-{i}", "title": "Python Developer", "creationDate": days_ago_ms(1)}
        for i in range(count)
    ]
    return httpx.Response(200, json={"jvs": jobs})


@respx.mock
async def test_collects_jobs_from_all_pages():
    respx.post(EURES_SEARCH_URL).mock(side_effect=[page_of(EURES_PAGE_SIZE, "a"), page_of(3, "b")])

    async with httpx.AsyncClient() as client:
        vacancies = await fetch_eures_country(client, "PL")

    assert len(vacancies) == EURES_PAGE_SIZE + 3
    assert vacancies[0].external_id == "a-0"
    assert vacancies[-1].external_id == "b-2"


@respx.mock
async def test_asks_for_pages_in_order():
    route = respx.post(EURES_SEARCH_URL).mock(side_effect=[page_of(EURES_PAGE_SIZE), page_of(0)])

    async with httpx.AsyncClient() as client:
        await fetch_eures_country(client, "PL")

    pages = [json.loads(call.request.content)["page"] for call in route.calls]
    assert pages == [1, 2]


@respx.mock
async def test_short_page_stops_without_an_extra_request():
    route = respx.post(EURES_SEARCH_URL).mock(return_value=page_of(3))

    async with httpx.AsyncClient() as client:
        await fetch_eures_country(client, "MT")

    assert route.call_count == 1


@respx.mock
async def test_stops_at_max_pages_even_if_more_jobs_exist():
    route = respx.post(EURES_SEARCH_URL).mock(return_value=page_of(EURES_PAGE_SIZE))

    async with httpx.AsyncClient() as client:
        vacancies = await fetch_eures_country(client, "PL", max_pages=2)

    assert route.call_count == 2
    assert len(vacancies) == EURES_PAGE_SIZE * 2


@respx.mock
async def test_country_without_jobs_gives_an_empty_list():
    respx.post(EURES_SEARCH_URL).mock(return_value=httpx.Response(200, json={"jvs": []}))

    async with httpx.AsyncClient() as client:
        assert await fetch_eures_country(client, "CY") == []


@respx.mock
async def test_broken_job_does_not_end_the_paging():
    """A full page with one broken job is still a full page, so the next one is requested."""
    jobs = [
        {"id": f"job-{i}", "title": "Python Developer", "creationDate": days_ago_ms(1)}
        for i in range(EURES_PAGE_SIZE - 1)
    ]
    jobs.append({"id": "no-title"})
    route = respx.post(EURES_SEARCH_URL).mock(
        side_effect=[httpx.Response(200, json={"jvs": jobs}), page_of(1, "last")]
    )

    async with httpx.AsyncClient() as client:
        vacancies = await fetch_eures_country(client, "PL")

    assert route.call_count == 2
    assert len(vacancies) == EURES_PAGE_SIZE


@respx.mock
async def test_error_on_a_later_page_raises():
    respx.post(EURES_SEARCH_URL).mock(side_effect=[page_of(EURES_PAGE_SIZE), httpx.Response(500)])

    async with httpx.AsyncClient() as client:
        with pytest.raises(httpx.HTTPStatusError):
            await fetch_eures_country(client, "PL")


@respx.mock
async def test_pauses_only_between_pages(pauses):
    respx.post(EURES_SEARCH_URL).mock(
        side_effect=[page_of(EURES_PAGE_SIZE), page_of(EURES_PAGE_SIZE), page_of(1)]
    )

    async with httpx.AsyncClient() as client:
        await fetch_eures_country(client, "PL", pause_seconds=0.5)

    assert pauses == [0.5, 0.5]


@respx.mock
async def test_one_page_country_does_not_pause(pauses):
    respx.post(EURES_SEARCH_URL).mock(return_value=page_of(3))

    async with httpx.AsyncClient() as client:
        await fetch_eures_country(client, "MT")

    assert pauses == []


@respx.mock
async def test_keeps_only_jobs_published_in_the_last_month():
    jobs = [
        {"id": "fresh", "title": "Cook", "creationDate": days_ago_ms(29)},
        {"id": "old", "title": "Cook", "creationDate": days_ago_ms(31)},
        {"id": "no-date", "title": "Cook"},
    ]
    respx.post(EURES_SEARCH_URL).mock(return_value=httpx.Response(200, json={"jvs": jobs}))

    async with httpx.AsyncClient() as client:
        vacancies = await fetch_eures_country(client, "GR")

    assert [vacancy.external_id for vacancy in vacancies] == ["fresh"]


@respx.mock
async def test_page_of_old_jobs_does_not_end_the_paging():
    """Pages are sorted by update date, so fresh jobs can follow a page of old ones."""
    old_jobs = [
        {"id": f"old-{i}", "title": "Cook", "creationDate": days_ago_ms(90)}
        for i in range(EURES_PAGE_SIZE)
    ]
    respx.post(EURES_SEARCH_URL).mock(
        side_effect=[httpx.Response(200, json={"jvs": old_jobs}), page_of(1, "fresh")]
    )

    async with httpx.AsyncClient() as client:
        vacancies = await fetch_eures_country(client, "PL")

    assert [vacancy.external_id for vacancy in vacancies] == ["fresh-0"]


@respx.mock
async def test_asks_eures_for_the_last_month():
    route = respx.post(EURES_SEARCH_URL).mock(return_value=page_of(1))

    async with httpx.AsyncClient() as client:
        await fetch_eures_country(client, "PL")

    assert json.loads(route.calls.last.request.content)["publicationPeriod"] == "LAST_MONTH"
