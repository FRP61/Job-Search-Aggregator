import httpx
import pytest
import respx
from sqlalchemy import delete

from app.integrations.ecb import ECB_RATES_URL, get_exchange_rates, parse_ecb_rates
from app.models import ApiCache

# The start of a real answer
ECB_XML = """<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <gesmes:subject>Reference rates</gesmes:subject>
  <Cube>
    <Cube time='2026-11-04'>
      <Cube currency='USD' rate='1.1267'/>
      <Cube currency='PLN' rate='4.25'/>
    </Cube>
  </Cube>
</gesmes:Envelope>"""


@pytest.fixture(autouse=True)
async def empty_cache(session):
    await session.execute(delete(ApiCache))
    await session.commit()


def test_rates_are_read_from_the_xml():
    assert parse_ecb_rates(ECB_XML) == {"USD": 1.1267, "PLN": 4.25}


@respx.mock
async def test_rates_are_downloaded(session):
    respx.get(ECB_RATES_URL).mock(return_value=httpx.Response(200, text=ECB_XML))

    async with httpx.AsyncClient() as client:
        assert (await get_exchange_rates(session, client))["PLN"] == 4.25


@respx.mock
async def test_second_call_comes_from_the_cache(session):
    route = respx.get(ECB_RATES_URL).mock(return_value=httpx.Response(200, text=ECB_XML))

    async with httpx.AsyncClient() as client:
        await get_exchange_rates(session, client)
        rates = await get_exchange_rates(session, client)

    assert rates["USD"] == 1.1267
    assert route.call_count == 1


@respx.mock
@pytest.mark.parametrize("answer", [httpx.Response(500), httpx.Response(200, text="<html>not closed")])
async def test_failure_gives_no_rates_and_is_not_cached(session, answer):
    route = respx.get(ECB_RATES_URL).mock(return_value=answer)

    async with httpx.AsyncClient() as client:
        assert await get_exchange_rates(session, client) == {}
        await get_exchange_rates(session, client)

    assert route.call_count == 2
