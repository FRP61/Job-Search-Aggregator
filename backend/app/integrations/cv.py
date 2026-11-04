"""cv.ee, cv.lv and cvonline.lt: one company's job boards in the Baltics, with the same API."""

from dataclasses import dataclass
from datetime import datetime
from functools import partial

import httpx

from app.integrations.base import JOB_PARSE_ERRORS, NormalizedVacancy, collect_pages, fill_computed_fields

CV_PAGE_SIZE = 500
CV_MAX_PAGES = 20
CV_SALARY_CURRENCY = "EUR"  # all three countries use the euro
# The board's category numbers, found by filtering by each category's name.
# Categories that fit none of our industries are left out.
CV_CATEGORY_TO_INDUSTRY = {
    1: "admin",  # ADMINISTRATION
    2: "admin",  # ORGANISATION_MANAGEMENT
    3: "construction",  # CONSTRUCTION_REAL_ESTATE
    5: "engineering",  # ELECTRONICS_TELECOM
    6: "engineering",  # ENERGETICS_ELECTRICITY
    7: "finance",  # FINANCE_ACCOUNTING
    8: "healthcare",  # HEALTH_SOCIAL_CARE
    9: "manufacturing",  # PRODUCTION_MANUFACTURING
    10: "it",  # INFORMATION_TECHNOLOGY
    11: "marketing",  # MEDIA_PR
    12: "legal",  # LAW_LEGAL
    13: "marketing",  # MARKETING_ADVERTISING
    14: "engineering",  # TECHNICAL_ENGINEERING
    15: "sales",  # SALES
    17: "customer-service",  # SERVICE_INDUSTRY
    18: "admin",  # STATE_PUBLIC_ADMIN
    19: "hospitality",  # TOURISM_HOTELS_CATERING
    20: "retail",  # TRADE
    21: "education",  # EDUCATION_SCIENCE
    22: "logistics",  # LOGISTICS_TRANSPORT
    23: "finance",  # BANKING_INSURANCE
    24: "hr",  # HUMAN_RESOURCES
    28: "healthcare",  # PHARMACY
}


@dataclass(frozen=True)
class CvSite:
    source: str
    search_url: str
    job_url: str
    country_code: str
    country_id: int  # the board's own number for its home country


CV_EE = CvSite(
    "cv_ee", "https://www.cv.ee/api/v1/vacancy-search-service/search", "https://www.cv.ee/et/vacancy/{job_id}", "EE", 1
)
CV_LV = CvSite(
    "cv_lv", "https://www.cv.lv/api/v1/vacancy-search-service/search", "https://www.cv.lv/lv/vacancy/{job_id}", "LV", 101
)
CV_LT = CvSite(
    "cv_lt",
    "https://www.cvonline.lt/api/v1/vacancy-search-service/search",
    "https://www.cvonline.lt/lt/vacancy/{job_id}",
    "LT",
    92,
)


def cv_industry(job: dict) -> str | None:
    """The industry of the first category we know, or None to guess from the title."""
    for category in job.get("categories") or []:
        if category in CV_CATEGORY_TO_INDUSTRY:
            return CV_CATEGORY_TO_INDUSTRY[category]
    return None


def parse_cv_job(job: dict, site: CvSite) -> NormalizedVacancy:
    """Turn one job into a NormalizedVacancy.

    The search gives the town only as a number, which can't be shown but can
    tell two branches of one company apart. Salaries are per month unless marked hourly.
    """
    has_salary = job.get("salaryFrom") is not None or job.get("salaryTo") is not None
    vacancy = NormalizedVacancy(
        source=site.source,
        external_id=str(job["id"]),
        title=job["positionTitle"],
        url=site.job_url.format(job_id=job["id"]),
        country_code=site.country_code,
        posted_at=datetime.fromisoformat(job["publishDate"]),
        company=job.get("employerName"),
        industry=cv_industry(job),
        description=job.get("positionContent"),
        location=f"town:{job['townId']}" if job.get("townId") else None,
        remote=job.get("remoteWorkType") == "FULLY_REMOTE",
        salary_min=job.get("salaryFrom"),
        salary_max=job.get("salaryTo"),
        salary_currency=CV_SALARY_CURRENCY if has_salary else None,
        salary_period=("hour" if job.get("hourlySalary") else "month") if has_salary else None,
    )
    return fill_computed_fields(vacancy)


def parse_cv_response(data: dict, site: CvSite) -> list[NormalizedVacancy]:
    """Turn a response into vacancies, skipping broken jobs and jobs in other countries."""
    vacancies = []
    for job in data.get("vacancies") or []:
        try:
            if job["countryId"] == site.country_id:
                vacancies.append(parse_cv_job(job, site))
        except JOB_PARSE_ERRORS:
            continue
    return vacancies


async def fetch_cv_jobs(
    client: httpx.AsyncClient, max_pages: int = CV_MAX_PAGES, pause_seconds: float = 0.2, *, site: CvSite
) -> list[NormalizedVacancy]:
    """Collect all of one site's jobs."""

    async def fetch_page(page: int) -> dict:
        params = {"limit": CV_PAGE_SIZE, "offset": (page - 1) * CV_PAGE_SIZE}
        response = await client.get(site.search_url, params=params)
        response.raise_for_status()
        return response.json()

    return await collect_pages(
        fetch_page,
        lambda data: parse_cv_response(data, site),
        lambda data: len(data.get("vacancies") or []),
        CV_PAGE_SIZE,
        max_pages,
        pause_seconds,
    )


fetch_cv_ee = partial(fetch_cv_jobs, site=CV_EE)
fetch_cv_lv = partial(fetch_cv_jobs, site=CV_LV)
fetch_cv_lt = partial(fetch_cv_jobs, site=CV_LT)
