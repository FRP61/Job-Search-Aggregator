"""EURES, the EU job portal: public employment services of all 27 member states."""

import asyncio
from datetime import UTC, datetime

import httpx

from app.integrations.base import JOB_PARSE_ERRORS, fill_computed_fields, NormalizedVacancy
from app.services.classify import industry_from_isco

EURES_JOB_URL = "https://europa.eu/eures/portal/jv-se/jv-details/{job_id}?lang=en"
EURES_SEARCH_URL = "https://europa.eu/eures/api/jv-searchengine/public/jv-search/search"
EURES_PAGE_SIZE = 50
ISCO_URI_PREFIX = "http://data.europa.eu/esco/isco/C"
OCCUPATION_URI_PREFIX = "http://data.europa.eu/esco/occupation/"


def eures_posted_at(job: dict) -> datetime:
    """EURES sends the publication time as milliseconds since 1970, in UTC."""
    return datetime.fromtimestamp(job["creationDate"] / 1000, tz=UTC)


def eures_industry(job: dict) -> str | None:
    """The industry from the job's ISCO codes, the first code that gives one wins.

    Codes are the same in every language, unlike the words in a title.
    """
    for uri in job.get("jobCategoriesCodes") or []:
        if uri.startswith(ISCO_URI_PREFIX):
            industry = industry_from_isco(uri.removeprefix(ISCO_URI_PREFIX))
            if industry is not None:
                return industry
    return None


def eures_location(job: dict, country_code: str) -> str | None:
    """The job's region codes in this country, like "DE402", sorted and joined by commas.

    The map uses EURES's own country codes, so Greece is under "EL", not "GR".
    """
    codes = (job.get("locationMap") or {}).get(eures_location_code(country_code).upper()) or []
    return ",".join(sorted(code for code in codes if code)) or None


def eures_occupation_uris(job: dict) -> list[str]:
    """The job's links to ESCO occupations, which need a lookup to become an ISCO code."""
    return [uri for uri in job.get("jobCategoriesCodes") or [] if uri.startswith(OCCUPATION_URI_PREFIX)]


def parse_eures_job(job: dict, country_code: str):
    """Turn one job from an EURES search response into a NormalizedVacancy.

    The search response has no city and no salary. We ask EURES one country
    at a time, so the country comes from the request, not from the job.
    """

    company = None
    employer = job.get("employer")
    if employer is not None:
        company = employer.get("name")

    industry = eures_industry(job)

    vacancy = NormalizedVacancy(
        source="eures",
        external_id=job["id"],
        title=job["title"],
        url=EURES_JOB_URL.format(job_id=job["id"]),
        country_code=country_code,
        company=company,
        industry=industry,
        occupation_uris=eures_occupation_uris(job) if industry is None else [],
        description=job.get("description"),
        posted_at=eures_posted_at(job),
        location=eures_location(job, country_code),
    )

    return fill_computed_fields(vacancy)


def parse_eures_response(data: dict, country_code: str):
    """Turn an EURES search response into a list of NormalizedVacancy."""
    vacancies = []
    for job in data.get("jvs", []):
        try:
            vacancy = parse_eures_job(job, country_code)
        except JOB_PARSE_ERRORS:
            continue
        vacancies.append(vacancy)
    return vacancies

def eures_location_code(country_code: str):
    if country_code == "GR":
        return "el"

    return country_code.lower()

def build_eures_search_body(country_code: str, page: int):
    return {
    "resultsPerPage": EURES_PAGE_SIZE,
    "page": page,
    "sortSearch": "MOST_RECENT",
    "keywords": [],
    "locationCodes": [eures_location_code(country_code)],
    "positionScheduleCodes": [],
    "positionOfferingCodes": [],
    "offeringCodes": [],
    "educationAndQualificationLevelCodes": [],
    "occupationUris": [],
    "sectorCodes": [],
    "publicationPeriod": "LAST_MONTH",
    "euresFlagCodes": [],
    "otherBenefitsCodes": [],
    "requiredExperienceCodes": [],
    "requiredLanguages": [],
    "minNumberPost": None,
    "sessionId": "x",
    }


async def fetch_eures_page(client: httpx.AsyncClient, country_code: str, page: int) -> dict:
    """Ask EURES for one page of one country's jobs and return the raw JSON.

    An HTTP error (EURES is down, rate limit) raises httpx.HTTPStatusError,
    so a failed request is never mistaken for "this country has no jobs".
    """
    body = build_eures_search_body(country_code, page)
    response = await client.post(EURES_SEARCH_URL, json=body)
    response.raise_for_status()
    return response.json()


async def fetch_eures_country(
    client: httpx.AsyncClient, country_code: str, max_pages: int = 20, pause_seconds: float = 0.2
) -> list[NormalizedVacancy]:
    """Collect a country's most recently updated jobs, up to max_pages pages.

    MOST_RECENT sorts by lastModificationDate, not by publication date, and
    LAST_MONTH also lets old jobs through if they were updated recently. So
    we check the publication date ourselves and drop jobs older than 30 days.
    A short page means it was the last one, so no extra request is made.
    An HTTP error on any page raises, and the pages already read are dropped.
    The pause goes between pages, so a one-page country doesn't wait at all.
    """
    now = datetime.now(UTC)
    vacancies = []
    for page in range(1, max_pages + 1):
        if page > 1:
            await asyncio.sleep(pause_seconds)
        data = await fetch_eures_page(client, country_code, page)
        for vacancy in parse_eures_response(data, country_code):
            if not vacancy.is_too_old(now):
                vacancies.append(vacancy)
        if len(data.get("jvs", [])) < EURES_PAGE_SIZE:
            break
    return vacancies

