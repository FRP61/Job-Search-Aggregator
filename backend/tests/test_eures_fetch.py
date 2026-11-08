import json

import httpx
import pytest
import respx

from app.integrations.eures import EURES_SEARCH_URL, fetch_eures_page


@respx.mock
async def test_returns_the_json_from_eures():
    respx.post(EURES_SEARCH_URL).mock(
        return_value=httpx.Response(200, json={"numberRecords": 1, "jvs": [{"id": "abc"}]})
    )

    async with httpx.AsyncClient() as client:
        data = await fetch_eures_page(client, "PL", 1)

    assert data == {"numberRecords": 1, "jvs": [{"id": "abc"}]}


@respx.mock
async def test_sends_country_and_page_in_the_body():
    route = respx.post(EURES_SEARCH_URL).mock(return_value=httpx.Response(200, json={"jvs": []}))

    async with httpx.AsyncClient() as client:
        await fetch_eures_page(client, "GR", 3)

    sent = json.loads(route.calls.last.request.content)
    assert sent["locationCodes"] == ["el"]
    assert sent["page"] == 3


@respx.mock
async def test_server_error_raises_instead_of_returning_nothing():
    respx.post(EURES_SEARCH_URL).mock(return_value=httpx.Response(500))

    async with httpx.AsyncClient() as client:
        with pytest.raises(httpx.HTTPStatusError):
            await fetch_eures_page(client, "PL", 1)
