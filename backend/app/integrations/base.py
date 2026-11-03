"""The unified vacancy format: every job board adapter converts its data into this."""

from dataclasses import dataclass
from app.services.classify import classify_industry
from app.services.normalize import fingerprint
from app.services.salary import to_annual, to_eur

@dataclass
class NormalizedVacancy:
    source: str
    external_id: str
    title: str
    url: str
    country_code: str
    company: str | None = None
    industry: str | None = None
    description: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str | None = None
    salary_period: str | None = None
    city: str | None = None
    remote: bool = False
    fingerprint: str = ""


def fill_computed_fields(vacancy: NormalizedVacancy) -> NormalizedVacancy:
    """Fill the fields we compute ourselves, then return the same vacancy.

    The board's own industry is kept; only a missing one is guessed from the title.
    """

    if vacancy.industry is None:
        vacancy.industry = classify_industry(vacancy.title)
    vacancy.fingerprint = fingerprint(vacancy.title, vacancy.company, vacancy.country_code, vacancy.city)
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
