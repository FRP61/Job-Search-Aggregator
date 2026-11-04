"""Save vacancies from job boards into the database without creating duplicates."""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.base import NormalizedVacancy, annual_max_eur, annual_min_eur
from app.models import Industry, Vacancy, utcnow


@dataclass
class SaveResult:
    inserted: int = 0
    updated: int = 0
    merged: int = 0
    skipped: int = 0


def _copy_fields(row: Vacancy, vacancy: NormalizedVacancy, industry_id: int | None, rates: dict[str, float]) -> None:
    """Copy a vacancy's data into a table row, cutting text to the column sizes."""
    row.title = vacancy.title[:500]
    row.company = vacancy.company[:255] if vacancy.company else None
    row.country_code = vacancy.country_code
    row.industry_id = industry_id
    row.city = vacancy.city[:255] if vacancy.city else None
    row.description = vacancy.description
    row.url = vacancy.url[:2000]
    row.remote = vacancy.remote
    row.salary_min = vacancy.salary_min
    row.salary_max = vacancy.salary_max
    row.salary_currency = vacancy.salary_currency
    row.salary_period = vacancy.salary_period
    row.salary_annual_min_eur = annual_min_eur(vacancy, rates)
    row.salary_annual_max_eur = annual_max_eur(vacancy, rates)
    row.posted_at = vacancy.posted_at
    row.fetched_at = utcnow()


async def save_vacancies(
    session: AsyncSession, vacancies: list[NormalizedVacancy], rates: dict[str, float]
) -> SaveResult:
    """Save one batch of vacancies. `rates` converts salaries to euros, see to_eur.

    Same source and id already saved         -> update that row (updated)
    Same fingerprint from another source     -> add a link to other_sources (merged)
    Same fingerprint, same source or link    -> nothing new (skipped)
    Otherwise                                -> new row (inserted)
    """
    result = SaveResult()
    if not vacancies:
        return result

    industries = await session.scalars(select(Industry))
    industry_ids = {industry.slug: industry.id for industry in industries}

    rows = await session.scalars(
        select(Vacancy).where(
            Vacancy.external_id.in_([vacancy.external_id for vacancy in vacancies])
            | Vacancy.fingerprint.in_([vacancy.fingerprint for vacancy in vacancies])
        )
    )
    rows = rows.all()
    by_external_id = {(row.source, row.external_id): row for row in rows}
    by_fingerprint = {row.fingerprint: row for row in rows}

    for vacancy in vacancies:
        industry_id = industry_ids.get(vacancy.industry)
        row = by_external_id.get((vacancy.source, vacancy.external_id))
        twin = by_fingerprint.get(vacancy.fingerprint)

        if row is not None:
            # A changed title can make the fingerprint equal to another row's.
            # The column is unique, so in that case the row keeps its old one.
            if twin is None:
                del by_fingerprint[row.fingerprint]
                row.fingerprint = vacancy.fingerprint
                by_fingerprint[row.fingerprint] = row
            _copy_fields(row, vacancy, industry_id, rates)
            result.updated += 1
        elif twin is None:
            row = Vacancy(source=vacancy.source, external_id=vacancy.external_id, fingerprint=vacancy.fingerprint)
            _copy_fields(row, vacancy, industry_id, rates)
            session.add(row)
            by_external_id[(row.source, row.external_id)] = row
            by_fingerprint[row.fingerprint] = row
            result.inserted += 1
        elif twin.source == vacancy.source:
            result.skipped += 1
        else:
            link = {"source": vacancy.source, "url": vacancy.url}
            links = twin.other_sources or []
            if link in links:
                result.skipped += 1
            else:
                # A new list, because SQLAlchemy doesn't notice changes inside a JSON value
                twin.other_sources = [*links, link]
                result.merged += 1

    await session.commit()
    return result
