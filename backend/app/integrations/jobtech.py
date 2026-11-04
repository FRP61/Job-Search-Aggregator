"""JobTech: the open job search API of Arbetsförmedlingen, the Swedish employment service."""

from datetime import UTC, datetime

import httpx

from app.integrations.base import JOB_PARSE_ERRORS, NormalizedVacancy, collect_pages, fill_computed_fields

JT_SEARCH_URL = "https://jobsearch.api.jobtechdev.se/search"
JT_PAGE_SIZE = 100
JT_MAX_PAGES = 21  # offset above 2000 answers 400
JT_MINUTES_IN_30_DAYS = 43200
JT_SWEDEN = "Sverige"
# The board's own occupation fields, the same for every job
JT_FIELD_TO_INDUSTRY = {
    "Administration, ekonomi, juridik": "admin",
    "Bygg och anläggning": "construction",
    "Data/IT": "it",
    "Försäljning, inköp, marknadsföring": "sales",
    "Hotell, restaurang, storhushåll": "hospitality",
    "Hälso- och sjukvård": "healthcare",
    "Installation, drift, underhåll": "manufacturing",
    "Pedagogik": "education",
    "Transport, distribution, lager": "logistics",
    "Yrken med teknisk inriktning": "engineering",
}


def parse_jt_job(job: dict) -> NormalizedVacancy:
    """Turn one job into a NormalizedVacancy. Dates come without a time zone."""
    address = job.get("workplace_address") or {}
    field = (job.get("occupation_field") or {}).get("label")
    model = (job.get("workplace_model") or {}).get("label") or ""
    vacancy = NormalizedVacancy(
        source="jobtech",
        external_id=job["id"],
        title=job["headline"],
        url=job["webpage_url"],
        country_code="SE",
        posted_at=datetime.fromisoformat(job["publication_date"]).replace(tzinfo=UTC),
        company=(job.get("employer") or {}).get("name"),
        industry=JT_FIELD_TO_INDUSTRY.get(field),
        description=(job.get("description") or {}).get("text"),
        city=address.get("city") or address.get("municipality"),
        remote="distans" in model.lower(),
    )
    return fill_computed_fields(vacancy)


def parse_jt_response(data: dict) -> list[NormalizedVacancy]:
    """Turn a response into vacancies, skipping broken, removed and foreign jobs."""
    vacancies = []
    for job in data.get("hits") or []:
        try:
            address = job.get("workplace_address") or {}
            if not job.get("removed") and address.get("country", JT_SWEDEN) == JT_SWEDEN:
                vacancies.append(parse_jt_job(job))
        except JOB_PARSE_ERRORS:
            continue
    return vacancies


async def fetch_jt_jobs(
    client: httpx.AsyncClient, max_pages: int = JT_MAX_PAGES, pause_seconds: float = 0.2
) -> list[NormalizedVacancy]:
    """Collect the newest jobs page by page."""

    async def fetch_page(page: int) -> dict:
        params = {
            "limit": JT_PAGE_SIZE,
            "offset": (page - 1) * JT_PAGE_SIZE,
            "sort": "pubdate-desc",
            "published-after": JT_MINUTES_IN_30_DAYS,
        }
        response = await client.get(JT_SEARCH_URL, params=params)
        response.raise_for_status()
        return response.json()

    return await collect_pages(
        fetch_page, parse_jt_response, lambda data: len(data.get("hits") or []), JT_PAGE_SIZE, max_pages, pause_seconds
    )
