"""Bundesagentur für Arbeit: the German federal employment agency's job search."""

import asyncio
from datetime import UTC, datetime

import httpx

from app.integrations.base import JOB_PARSE_ERRORS, NormalizedVacancy, fill_computed_fields
from app.services.classify import classify_industry

BA_SEARCH_URL = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs"
BA_JOB_URL = "https://www.arbeitsagentur.de/jobsuche/jobdetail/{job_id}"
# The same public client id for everyone, not a personal secret
BA_HEADERS = {"X-API-Key": "jobboerse-jobsuche"}
BA_PAGE_SIZE = 100
BA_GERMANY = "DEUTSCHLAND"


def ba_address(job: dict) -> dict:
    """The address of the job's first location, empty if it has none."""
    locations = job.get("stellenlokationen") or []
    if not locations:
        return {}
    return locations[0].get("adresse") or {}


def ba_posted_at(job: dict) -> datetime:
    """The board gives only a day, like "2026-11-04", so the time is midnight UTC."""
    return datetime.fromisoformat(job["datumErsteVeroeffentlichung"]).replace(tzinfo=UTC)


def ba_industry(job: dict) -> str:
    """Guess from the title, then from the occupation if the title says nothing."""
    industry = classify_industry(job["stellenangebotsTitel"])
    if industry == "other" and job.get("hauptberuf"):
        return classify_industry(job["hauptberuf"])
    return industry


def ba_match_title(job: dict) -> str | None:
    """EURES shows the jobs it gets from this board as "title (occupation)"."""
    if not job.get("hauptberuf"):
        return None
    return f"{job['stellenangebotsTitel']} ({job['hauptberuf']})"


def parse_ba_job(job: dict) -> NormalizedVacancy:
    """Turn one job from a search response into a NormalizedVacancy."""
    vacancy = NormalizedVacancy(
        source="bundesagentur",
        external_id=job["referenznummer"],
        title=job["stellenangebotsTitel"],
        url=BA_JOB_URL.format(job_id=job["referenznummer"]),
        country_code="DE",
        posted_at=ba_posted_at(job),
        company=job.get("firma"),
        industry=ba_industry(job),
        city=ba_address(job).get("ort"),
        remote=job.get("homeofficemoeglich") is True,
        match_title=ba_match_title(job),
    )
    return fill_computed_fields(vacancy)


def parse_ba_response(data: dict) -> list[NormalizedVacancy]:
    """Turn a search response into vacancies, skipping broken jobs and jobs abroad."""
    vacancies = []
    for job in data.get("ergebnisliste") or []:
        try:
            if ba_address(job).get("land", BA_GERMANY) == BA_GERMANY:
                vacancies.append(parse_ba_job(job))
        except JOB_PARSE_ERRORS:
            continue
    return vacancies


async def fetch_ba_page(client: httpx.AsyncClient, page: int) -> dict:
    """Ask for one page of jobs published in the last 30 days."""
    params = {"size": BA_PAGE_SIZE, "page": page, "veroeffentlichtseit": 30}
    response = await client.get(BA_SEARCH_URL, params=params, headers=BA_HEADERS)
    response.raise_for_status()
    return response.json()


async def fetch_ba_jobs(
    client: httpx.AsyncClient, max_pages: int = 10, pause_seconds: float = 0.2
) -> list[NormalizedVacancy]:
    """Collect jobs page by page. A short page means it was the last one.

    The age is also checked here, because the board's own filter isn't guaranteed.
    """
    now = datetime.now(UTC)
    vacancies = []
    for page in range(1, max_pages + 1):
        if page > 1:
            await asyncio.sleep(pause_seconds)
        data = await fetch_ba_page(client, page)
        for vacancy in parse_ba_response(data):
            if not vacancy.is_too_old(now):
                vacancies.append(vacancy)
        if len(data.get("ergebnisliste") or []) < BA_PAGE_SIZE:
            break
    return vacancies
