"""justjoin.it: IT jobs in Poland. It often shows real salaries."""

from datetime import datetime

import httpx

from app.integrations.base import JOB_PARSE_ERRORS, NormalizedVacancy, collect_pages, fill_computed_fields

JJ_SEARCH_URL = "https://justjoin.it/api/candidate-api/offers"
JJ_JOB_URL = "https://justjoin.it/job-offer/{slug}"
JJ_PAGE_SIZE = 100
JJ_MAX_PAGES = 100  # from=10000 answers 400
JJ_DEFAULT_INDUSTRY = "it"  # the board is about IT
# None leaves the choice to the words in the title
JJ_CATEGORY_TO_INDUSTRY = {"sales": "sales", "marketing": "marketing", "hr": "hr", "other": None}


def jj_salary(job: dict) -> dict | None:
    """The first salary in the employer's own currency.

    The board also lists the same salary converted to other currencies, marked
    "conversion", with its own rates. We convert with one source of rates instead.
    """
    for employment in job.get("employmentTypes") or []:
        if employment.get("currencySource") == "original" and employment.get("fromPerUnit") is not None:
            return employment
    return None


def parse_jj_job(job: dict) -> NormalizedVacancy:
    """Turn one offer into a NormalizedVacancy.

    Amounts come from fromPerUnit and toPerUnit, the real rate per hour, day or
    month. The plain from and to are already scaled to a month: 17 per hour gives
    from=2856, which read as an hourly rate would make millions a year.
    """
    salary = jj_salary(job) or {}
    category = (job.get("category") or {}).get("key")
    vacancy = NormalizedVacancy(
        source="justjoin",
        external_id=job["guid"],
        title=job["title"],
        url=JJ_JOB_URL.format(slug=job["slug"]),
        country_code="PL",
        posted_at=datetime.fromisoformat(job["publishedAt"]),
        company=job.get("companyName"),
        industry=JJ_CATEGORY_TO_INDUSTRY.get(category, JJ_DEFAULT_INDUSTRY),
        city=job.get("city"),
        remote=job.get("workplaceType") == "remote",
        salary_min=salary.get("fromPerUnit"),
        salary_max=salary.get("toPerUnit"),
        salary_currency=salary.get("currency"),
        salary_period=salary["unit"].lower() if salary.get("unit") else None,
    )
    return fill_computed_fields(vacancy)


def parse_jj_response(data: dict) -> list[NormalizedVacancy]:
    """Turn a response into vacancies, skipping broken ones."""
    vacancies = []
    for job in data.get("data") or []:
        try:
            vacancies.append(parse_jj_job(job))
        except JOB_PARSE_ERRORS:
            continue
    return vacancies


async def fetch_jj_jobs(
    client: httpx.AsyncClient, max_pages: int = JJ_MAX_PAGES, pause_seconds: float = 0.2
) -> list[NormalizedVacancy]:
    """Collect offers page by page."""

    async def fetch_page(page: int) -> dict:
        params = {"from": (page - 1) * JJ_PAGE_SIZE, "itemsCount": JJ_PAGE_SIZE}
        response = await client.get(JJ_SEARCH_URL, params=params)
        response.raise_for_status()
        return response.json()

    return await collect_pages(
        fetch_page, parse_jj_response, lambda data: len(data.get("data") or []), JJ_PAGE_SIZE, max_pages, pause_seconds
    )
