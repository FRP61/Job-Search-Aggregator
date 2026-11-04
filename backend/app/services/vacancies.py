"""Save vacancies from job boards into the database without creating duplicates."""

import asyncio
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.base import NormalizedVacancy, annual_max_eur, annual_min_eur
from app.integrations.bundesagentur import fetch_ba_jobs
from app.integrations.esco import apply_occupation_industries
from app.integrations.eures import fetch_eures_country
from app.models import Country, Industry, Vacancy, utcnow


# A copy on another board appears soon after the original. Further apart than
# this, the same title at the same company is more likely another branch's job.
COPY_MAX_DAYS_APART = 3


@dataclass
class SaveResult:
    inserted: int = 0
    updated: int = 0
    merged: int = 0
    skipped: int = 0
    failed_countries: list[str] = field(default_factory=list)

    def add(self, other: "SaveResult") -> None:
        """Add the counts of one saved batch to this total."""
        self.inserted += other.inserted
        self.updated += other.updated
        self.merged += other.merged
        self.skipped += other.skipped


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
    row.loose_fingerprint = vacancy.loose_fingerprint
    row.fetched_at = utcnow()


async def _load_industry_ids(session: AsyncSession) -> dict[str, int]:
    """Industry slug -> its id in the database."""
    industries = await session.scalars(select(Industry))
    return {industry.slug: industry.id for industry in industries}


async def _load_existing_rows(session: AsyncSession, vacancies: list[NormalizedVacancy]) -> list[Vacancy]:
    """Rows that could be the same job as one of these vacancies, in one query."""
    rows = await session.scalars(
        select(Vacancy).where(
            Vacancy.external_id.in_([vacancy.external_id for vacancy in vacancies])
            | Vacancy.fingerprint.in_([vacancy.fingerprint for vacancy in vacancies])
            | Vacancy.loose_fingerprint.in_([v.loose_fingerprint for v in vacancies if v.loose_fingerprint])
        )
    )
    return list(rows)


def _row_key(source: str, external_id: str, country_code: str) -> tuple[str, str, str]:
    """A row's identity: one job can have a separate row for each country."""
    return (source, external_id, country_code)


def _published_close_together(row: Vacancy, vacancy: NormalizedVacancy) -> bool:
    """True if both were published within COPY_MAX_DAYS_APART days of each other."""
    if row.posted_at is None:
        return False
    return abs(_as_utc(row.posted_at) - vacancy.posted_at) <= timedelta(days=COPY_MAX_DAYS_APART)


def _as_utc(moment: datetime) -> datetime:
    """SQLite gives dates back without a time zone, Postgres with one."""
    return moment if moment.tzinfo else moment.replace(tzinfo=UTC)


def _find_twin_without_city(rows: list[Vacancy], vacancy: NormalizedVacancy) -> Vacancy | None:
    """The same job on another board, where one of the two has no city to compare."""
    for row in rows:
        if (
            row.source != vacancy.source
            and (row.city is None or vacancy.city is None)
            and _published_close_together(row, vacancy)
        ):
            return row
    return None


def _add_other_source(twin: Vacancy, vacancy: NormalizedVacancy) -> bool:
    """Link a vacancy from another board to its twin. False if already linked."""
    link = {"source": vacancy.source, "url": vacancy.url}
    links = twin.other_sources or []
    if link in links:
        return False
    # A new list, because SQLAlchemy doesn't notice changes inside a JSON value
    twin.other_sources = [*links, link]
    return True


async def save_vacancies(
    session: AsyncSession, vacancies: list[NormalizedVacancy], rates: dict[str, float]
) -> SaveResult:
    """Save one batch of vacancies. `rates` converts salaries to euros, see to_eur.

    Same source, id and country already saved -> update that row (updated)
    Same fingerprint from another source      -> add a link to other_sources (merged)
    Another source, no city to compare, close
    publication dates                         -> add a link to other_sources (merged)
    Same fingerprint, same source or link     -> nothing new (skipped)
    Otherwise                                 -> new row (inserted)
    """
    result = SaveResult()
    if not vacancies:
        return result

    industry_ids = await _load_industry_ids(session)
    rows = await _load_existing_rows(session, vacancies)
    by_key = {_row_key(row.source, row.external_id, row.country_code): row for row in rows}
    by_fingerprint = {row.fingerprint: row for row in rows}
    by_loose_fingerprint: dict[str, list[Vacancy]] = {}
    for row in rows:
        if row.loose_fingerprint:
            by_loose_fingerprint.setdefault(row.loose_fingerprint, []).append(row)

    for vacancy in vacancies:
        industry_id = industry_ids.get(vacancy.industry)
        key = _row_key(vacancy.source, vacancy.external_id, vacancy.country_code)
        row = by_key.get(key)
        twin = by_fingerprint.get(vacancy.fingerprint)
        if row is None and twin is None:
            twin = _find_twin_without_city(by_loose_fingerprint.get(vacancy.loose_fingerprint, []), vacancy)

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
            by_key[key] = row
            by_fingerprint[row.fingerprint] = row
            if row.loose_fingerprint:
                by_loose_fingerprint.setdefault(row.loose_fingerprint, []).append(row)
            result.inserted += 1
        elif twin.source == vacancy.source:
            result.skipped += 1
        elif _add_other_source(twin, vacancy):
            result.merged += 1
        else:
            result.skipped += 1

    await session.commit()
    return result


async def refresh_eures(
    session: AsyncSession,
    client: httpx.AsyncClient,
    country_codes: list[str] | None = None,
    max_pages: int = 20,
    pause_seconds: float = 0.2,
) -> SaveResult:
    """Download EURES jobs country by country and save them. No codes means all active countries.

    A country whose request fails is noted in failed_countries and the rest carry on.
    Rates are empty because EURES search results have no salaries.
    """
    query = select(Country.code).where(Country.is_active).order_by(Country.code)
    if country_codes is not None:
        query = query.where(Country.code.in_(country_codes))
    codes = (await session.scalars(query)).all()

    total = SaveResult()
    for index, code in enumerate(codes):
        if index > 0:
            await asyncio.sleep(pause_seconds)
        try:
            vacancies = await fetch_eures_country(client, code, max_pages, pause_seconds)
        except httpx.HTTPError:
            total.failed_countries.append(code)
            continue
        await apply_occupation_industries(session, client, vacancies, pause_seconds)
        total.add(await save_vacancies(session, vacancies, {}))
    return total


async def refresh_bundesagentur(
    session: AsyncSession, client: httpx.AsyncClient, max_pages: int = 10, pause_seconds: float = 0.2
) -> SaveResult:
    """Download German jobs from the Bundesagentur and save them.

    A failed request is noted in failed_countries as "DE". Rates are empty
    because the search results have no salary amounts.
    """
    try:
        vacancies = await fetch_ba_jobs(client, max_pages, pause_seconds)
    except httpx.HTTPError:
        return SaveResult(failed_countries=["DE"])
    return await save_vacancies(session, vacancies, {})
