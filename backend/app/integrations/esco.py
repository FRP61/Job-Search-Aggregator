"""ESCO, the EU's list of occupations: turns an occupation link into an ISCO code."""

import asyncio
import logging

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.base import REQUEST_ERRORS, NormalizedVacancy
from app.services.cache import cache_get_many, cache_key, cache_set
from app.services.classify import industry_from_isco

logger = logging.getLogger(__name__)

ESCO_OCCUPATION_URL = "https://ec.europa.eu/esco/api/resource/occupation"
ESCO_CACHE_DAYS = 365  # ESCO publishes a new version about once a year


async def fetch_isco_code(client: httpx.AsyncClient, uri: str) -> str | None:
    """Ask ESCO for an occupation's ISCO code. None if ESCO doesn't know it.

    ESCO's code starts with the ISCO code: "3313.2" (bookkeeper) -> "3313".
    """
    response = await client.get(ESCO_OCCUPATION_URL, params={"uri": uri, "language": "en"})
    if response.status_code == 404:
        return None
    response.raise_for_status()
    code = response.json().get("code")
    if not code:
        return None
    return code.split(".")[0]


async def resolve_isco_codes(
    session: AsyncSession, client: httpx.AsyncClient, uris: set[str], pause_seconds: float = 0.2
) -> dict[str, str]:
    """Occupation link -> ISCO code, asking ESCO only for links not in the cache.

    If ESCO fails we stop asking until the next run, because waiting for a
    timeout on hundreds of links would stall the refresh. Those jobs keep the
    industry guessed from the title.
    """
    keys = {uri: cache_key(uri) for uri in sorted(uris)}
    cached = await cache_get_many(session, list(keys.values()))

    codes = {uri: cached[key]["isco"] for uri, key in keys.items() if key in cached}
    asked = 0
    for uri, key in keys.items():
        if uri in codes:
            continue
        if asked > 0:
            await asyncio.sleep(pause_seconds)
        asked += 1
        try:
            code = await fetch_isco_code(client, uri)
        except REQUEST_ERRORS as error:
            logger.warning("ESCO lookup stopped, %d links unresolved: %r", len(keys) - len(codes), error)
            break
        if code is not None:
            codes[uri] = code
            await cache_set(session, key, {"isco": code}, ESCO_CACHE_DAYS)
    return codes


async def apply_occupation_industries(
    session: AsyncSession,
    client: httpx.AsyncClient,
    vacancies: list[NormalizedVacancy],
    pause_seconds: float = 0.2,
) -> None:
    """Replace the guessed industry with the one from the occupation, where there is one."""
    uris = {uri for vacancy in vacancies for uri in vacancy.occupation_uris}
    if not uris:
        return
    codes = await resolve_isco_codes(session, client, uris, pause_seconds)

    for vacancy in vacancies:
        for uri in vacancy.occupation_uris:
            industry = industry_from_isco(codes[uri]) if uri in codes else None
            if industry is not None:
                vacancy.industry = industry
                break
