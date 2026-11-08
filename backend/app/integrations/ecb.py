"""European Central Bank exchange rates, to compare salaries in euros."""

import logging
import xml.etree.ElementTree as ElementTree

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.base import REQUEST_ERRORS
from app.services.cache import cache_get_many, cache_key, cache_set

logger = logging.getLogger(__name__)

ECB_RATES_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
RATES_CACHE_KEY = cache_key("ecb-daily-rates")
RATES_CACHE_DAYS = 1  # the bank publishes new rates once per working day


def parse_ecb_rates(xml_text: str) -> dict[str, float]:
    """How many units of each currency one euro buys: {"PLN": 4.25, ...}."""
    root = ElementTree.fromstring(xml_text)
    return {
        element.attrib["currency"]: float(element.attrib["rate"])
        for element in root.iter()
        if "currency" in element.attrib
    }


async def get_exchange_rates(session: AsyncSession, client: httpx.AsyncClient) -> dict[str, float]:
    """Today's rates, from the cache if possible.

    Without rates only salaries in euros can be compared. That isn't worth
    stopping a refresh for, so a failure gives an empty dict and a warning.
    """
    cached = await cache_get_many(session, [RATES_CACHE_KEY])
    if RATES_CACHE_KEY in cached:
        return cached[RATES_CACHE_KEY]

    try:
        response = await client.get(ECB_RATES_URL)
        response.raise_for_status()
        rates = parse_ecb_rates(response.text)
    except (*REQUEST_ERRORS, ElementTree.ParseError) as error:
        logger.warning("No exchange rates: %r", error)
        return {}
    if rates:
        await cache_set(session, RATES_CACHE_KEY, rates, RATES_CACHE_DAYS)
    return rates
