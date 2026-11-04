from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_session
from app.integrations.base import MAX_VACANCY_AGE_DAYS
from app.models import Vacancy, utcnow
from app.schemas import VacancyOut, VacancyPageOut

router = APIRouter(prefix="/vacancies", tags=["vacancies"])


def _search_filters(countries: list[str] | None, now: datetime) -> list:
    """Conditions of a search. No countries means every country."""
    filters = [Vacancy.posted_at >= now - timedelta(days=MAX_VACANCY_AGE_DAYS)]
    if countries:
        filters.append(Vacancy.country_code.in_([code.upper() for code in countries]))
    return filters


async def _load_countries(session: AsyncSession, rows: list[Vacancy], now: datetime) -> dict[tuple[str, str], list[str]]:
    """(source, external_id) -> every country where that job is still fresh, sorted."""
    result = await session.execute(
        select(Vacancy.source, Vacancy.external_id, Vacancy.country_code)
        .where(*_search_filters(None, now), Vacancy.external_id.in_([row.external_id for row in rows]))
        .order_by(Vacancy.country_code)
    )
    countries: dict[tuple[str, str], list[str]] = {}
    for source, external_id, country_code in result:
        countries.setdefault((source, external_id), []).append(country_code)
    return countries


@router.get("", response_model=VacancyPageOut)
async def list_vacancies(
    country: list[str] | None = Query(None, description="Repeat for several: ?country=PL&country=GR. Omit for all."),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    """Vacancies published in the last 30 days, newest first.

    A job listed in several countries comes once, with all of them in `countries`.
    """
    now = utcnow()
    # One group per job: its rows differ only by country
    jobs = select(func.min(Vacancy.id).label("id")).where(*_search_filters(country, now)).group_by(
        Vacancy.source, Vacancy.external_id
    )

    total = await session.scalar(select(func.count()).select_from(jobs.subquery()))
    page_ids = await session.scalars(
        jobs.order_by(func.max(Vacancy.posted_at).desc(), func.min(Vacancy.id).desc())
        .limit(page_size)
        .offset((page - 1) * page_size)
    )
    page_ids = list(page_ids)

    rows = await session.scalars(select(Vacancy).where(Vacancy.id.in_(page_ids)).options(selectinload(Vacancy.industry)))
    row_by_id = {row.id: row for row in rows}
    ordered_rows = [row_by_id[row_id] for row_id in page_ids]

    countries = await _load_countries(session, ordered_rows, now)
    items = [
        VacancyOut.model_validate(row).model_copy(update={"countries": countries[(row.source, row.external_id)]})
        for row in ordered_rows
    ]
    return VacancyPageOut(total=total, page=page, page_size=page_size, items=items)
