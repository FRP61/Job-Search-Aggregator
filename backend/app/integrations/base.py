"""The unified vacancy format: every job board adapter converts its data into this."""

from dataclasses import dataclass, field
from datetime import datetime, timedelta

import httpx

from app.services.classify import classify_industry
from app.services.normalize import fingerprint
from app.services.salary import to_annual, to_eur

MAX_VACANCY_AGE_DAYS = 30

# What a job with a missing or malformed field can raise while it is parsed.
# One broken job is skipped, it must not stop the whole download.
JOB_PARSE_ERRORS = (KeyError, TypeError, ValueError, AttributeError, OverflowError, OSError)
# A failed request, or an answer that isn't JSON, like a maintenance page with status 200.
# json.JSONDecodeError is a ValueError.
REQUEST_ERRORS = (httpx.HTTPError, ValueError)


@dataclass
class NormalizedVacancy:
    source: str
    external_id: str
    title: str
    url: str
    country_code: str
    posted_at: datetime
    company: str | None = None
    industry: str | None = None
    description: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str | None = None
    salary_period: str | None = None
    city: str | None = None
    # Where the job is when the board gives no city, like a region code
    location: str | None = None
    remote: bool = False
    fingerprint: str = ""
    # The title as other boards write it, if it differs from ours
    match_title: str | None = None
    # Finds the same job on a board that has no city. None without a company: too unsure
    loose_fingerprint: str | None = None
    # Occupation links to look up when the industry so far is only a guess from the title
    occupation_uris: list[str] = field(default_factory=list)

    def is_too_old(self, now: datetime, max_age_days: int = MAX_VACANCY_AGE_DAYS) -> bool:
        """True if more than max_age_days days have passed since publication."""
        return now - self.posted_at > timedelta(days=max_age_days)


def fill_computed_fields(vacancy: NormalizedVacancy) -> NormalizedVacancy:
    """Fill the fields we compute ourselves, then return the same vacancy.

    The board's own industry is kept; only a missing one is guessed from the title.
    """

    if vacancy.industry is None:
        vacancy.industry = classify_industry(vacancy.title)
    place = vacancy.city or vacancy.location
    vacancy.fingerprint = fingerprint(vacancy.title, vacancy.company, vacancy.country_code, place)
    if vacancy.company:
        title = vacancy.match_title or vacancy.title
        vacancy.loose_fingerprint = fingerprint(title, vacancy.company, vacancy.country_code, None)
    return vacancy

def annual_min_eur(vacancy: NormalizedVacancy, rates: dict[str, float]) -> float | None:
    if vacancy.salary_currency is None:
        return None

    annual = to_annual(vacancy.salary_min, vacancy.salary_period)
    eur_amount = to_eur(annual, vacancy.salary_currency, rates)
    return eur_amount

def annual_max_eur(vacancy: NormalizedVacancy, rates: dict[str, float]) -> float | None:
    if vacancy.salary_currency is None:
        return None

    annual = to_annual(vacancy.salary_max, vacancy.salary_period)
    eur_amount = to_eur(annual, vacancy.salary_currency, rates)
    return eur_amount
