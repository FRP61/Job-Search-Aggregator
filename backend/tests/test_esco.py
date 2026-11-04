from datetime import UTC, datetime

import httpx
import pytest
import respx
from sqlalchemy import delete

from app.integrations.base import NormalizedVacancy
from app.integrations.esco import (
    ESCO_OCCUPATION_URL,
    apply_occupation_industries,
    fetch_isco_code,
    resolve_isco_codes,
)
from app.models import ApiCache
from app.services.cache import cache_get_many, cache_key, cache_set

BOOKKEEPER = "http://data.europa.eu/esco/occupation/bookkeeper"
SECRETARY = "http://data.europa.eu/esco/occupation/secretary"
FARMER = "http://data.europa.eu/esco/occupation/farmer"
ANSWERS = {BOOKKEEPER: "3313.2", SECRETARY: "4120.1", FARMER: "6111.1"}


def esco_answer(request: httpx.Request) -> httpx.Response:
    code = ANSWERS.get(request.url.params["uri"])
    if code is None:
        return httpx.Response(404)
    return httpx.Response(200, json={"code": code})


def make_vacancy(uris: list[str], industry: str = "other") -> NormalizedVacancy:
    return NormalizedVacancy(
        source="eures",
        external_id="1",
        title="Pracownik",
        url="https://eures.example/1",
        country_code="PL",
        posted_at=datetime(2026, 11, 2, tzinfo=UTC),
        industry=industry,
        occupation_uris=uris,
    )


@pytest.fixture(autouse=True)
async def empty_cache(session):
    await session.execute(delete(ApiCache))
    await session.commit()


@pytest.fixture(autouse=True)
def pauses(monkeypatch):
    recorded = []

    async def fake_sleep(seconds):
        recorded.append(seconds)

    monkeypatch.setattr("app.integrations.esco.asyncio.sleep", fake_sleep)
    return recorded


@respx.mock
async def test_code_is_cut_to_the_isco_part():
    respx.get(ESCO_OCCUPATION_URL).mock(side_effect=esco_answer)

    async with httpx.AsyncClient() as client:
        assert await fetch_isco_code(client, BOOKKEEPER) == "3313"


@respx.mock
async def test_unknown_occupation_gives_none():
    respx.get(ESCO_OCCUPATION_URL).mock(side_effect=esco_answer)

    async with httpx.AsyncClient() as client:
        assert await fetch_isco_code(client, "http://data.europa.eu/esco/occupation/nope") is None


@respx.mock
async def test_answer_without_a_code_gives_none():
    respx.get(ESCO_OCCUPATION_URL).mock(return_value=httpx.Response(200, json={"title": "x"}))

    async with httpx.AsyncClient() as client:
        assert await fetch_isco_code(client, BOOKKEEPER) is None


@respx.mock
async def test_server_error_raises():
    respx.get(ESCO_OCCUPATION_URL).mock(return_value=httpx.Response(500))

    async with httpx.AsyncClient() as client:
        with pytest.raises(httpx.HTTPStatusError):
            await fetch_isco_code(client, BOOKKEEPER)


@respx.mock
async def test_second_lookup_comes_from_the_cache(session):
    route = respx.get(ESCO_OCCUPATION_URL).mock(side_effect=esco_answer)

    async with httpx.AsyncClient() as client:
        first = await resolve_isco_codes(session, client, {BOOKKEEPER, SECRETARY})
        second = await resolve_isco_codes(session, client, {BOOKKEEPER, SECRETARY})

    assert first == second == {BOOKKEEPER: "3313", SECRETARY: "4120"}
    assert route.call_count == 2


@respx.mock
async def test_only_new_links_are_requested(session):
    route = respx.get(ESCO_OCCUPATION_URL).mock(side_effect=esco_answer)

    async with httpx.AsyncClient() as client:
        await resolve_isco_codes(session, client, {BOOKKEEPER})
        await resolve_isco_codes(session, client, {BOOKKEEPER, SECRETARY})

    assert route.call_count == 2


@respx.mock
async def test_expired_answer_is_requested_again(session):
    route = respx.get(ESCO_OCCUPATION_URL).mock(side_effect=esco_answer)
    await cache_set(session, cache_key(BOOKKEEPER), {"isco": "9999"}, ttl_days=-1)

    async with httpx.AsyncClient() as client:
        codes = await resolve_isco_codes(session, client, {BOOKKEEPER})

    assert codes == {BOOKKEEPER: "3313"}
    assert route.call_count == 1


@respx.mock
async def test_esco_failure_stops_asking_and_keeps_what_it_has(session):
    route = respx.get(ESCO_OCCUPATION_URL).mock(
        side_effect=[httpx.Response(200, json={"code": "3313.2"}), httpx.Response(500)]
    )

    async with httpx.AsyncClient() as client:
        codes = await resolve_isco_codes(session, client, {BOOKKEEPER, FARMER, SECRETARY})

    assert codes == {BOOKKEEPER: "3313"}
    assert route.call_count == 2


@respx.mock
async def test_failed_lookup_is_not_cached(session):
    respx.get(ESCO_OCCUPATION_URL).mock(return_value=httpx.Response(500))

    async with httpx.AsyncClient() as client:
        await resolve_isco_codes(session, client, {BOOKKEEPER})

    assert await cache_get_many(session, [cache_key(BOOKKEEPER)]) == {}


@respx.mock
async def test_occupation_replaces_the_guess(session):
    respx.get(ESCO_OCCUPATION_URL).mock(side_effect=esco_answer)
    vacancy = make_vacancy([BOOKKEEPER], industry="other")

    async with httpx.AsyncClient() as client:
        await apply_occupation_industries(session, client, [vacancy])

    assert vacancy.industry == "finance"


@respx.mock
async def test_first_occupation_with_an_industry_wins(session):
    respx.get(ESCO_OCCUPATION_URL).mock(side_effect=esco_answer)
    vacancy = make_vacancy([FARMER, SECRETARY, BOOKKEEPER])

    async with httpx.AsyncClient() as client:
        await apply_occupation_industries(session, client, [vacancy])

    assert vacancy.industry == "admin"


@respx.mock
async def test_occupation_without_an_industry_keeps_the_guess(session):
    respx.get(ESCO_OCCUPATION_URL).mock(side_effect=esco_answer)
    vacancy = make_vacancy([FARMER], industry="sales")

    async with httpx.AsyncClient() as client:
        await apply_occupation_industries(session, client, [vacancy])

    assert vacancy.industry == "sales"


@respx.mock
async def test_esco_down_keeps_the_guess(session):
    respx.get(ESCO_OCCUPATION_URL).mock(side_effect=httpx.ConnectTimeout("no answer"))
    vacancy = make_vacancy([BOOKKEEPER], industry="sales")

    async with httpx.AsyncClient() as client:
        await apply_occupation_industries(session, client, [vacancy])

    assert vacancy.industry == "sales"


@respx.mock
async def test_no_occupations_means_no_requests(session):
    route = respx.get(ESCO_OCCUPATION_URL).mock(side_effect=esco_answer)

    async with httpx.AsyncClient() as client:
        await apply_occupation_industries(session, client, [make_vacancy([])])

    assert route.call_count == 0


@respx.mock
async def test_pauses_only_between_requests(session, pauses):
    respx.get(ESCO_OCCUPATION_URL).mock(side_effect=esco_answer)

    async with httpx.AsyncClient() as client:
        await resolve_isco_codes(session, client, {BOOKKEEPER, SECRETARY, FARMER}, pause_seconds=0.5)

    assert pauses == [0.5, 0.5]


async def test_cache_set_replaces_an_old_value(session):
    await cache_set(session, "k", {"isco": "1"}, ttl_days=1)
    await cache_set(session, "k", {"isco": "2"}, ttl_days=1)

    assert await cache_get_many(session, ["k"]) == {"k": {"isco": "2"}}


def test_cache_key_fits_the_column():
    assert len(cache_key("http://data.europa.eu/esco/occupation/" + "x" * 500)) == 64
