from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_session
from app.integrations.base import MAX_VACANCY_AGE_DAYS
from app.models import Vacancy, utcnow
from app.schemas import VacancyPageOut

router = APIRouter(prefix="/vacancies", tags=["vacancies"])


def _search_filters(countries: list[str] | None, now: datetime) -> list:
    """Conditions of a search. No countries means every country."""
    filters = [Vacancy.posted_at >= now - timedelta(days=MAX_VACANCY_AGE_DAYS)]
    if countries:
        filters.append(Vacancy.country_code.in_([code.upper() for code in countries]))
    return filters


@router.get("", response_model=VacancyPageOut)
async def list_vacancies(
    country: list[str] | None = Query(None, description="Repeat for several: ?country=PL&country=GR. Omit for all."),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    """Vacancies published in the last 30 days, newest first."""
    filters = _search_filters(country, utcnow())

    total = await session.scalar(select(func.count()).select_from(Vacancy).where(*filters))
    items = await session.scalars(
        select(Vacancy)
        .where(*filters)
        .options(selectinload(Vacancy.industry))
        .order_by(Vacancy.posted_at.desc(), Vacancy.id.desc())
        .limit(page_size)
        .offset((page - 1) * page_size)
    )
    return VacancyPageOut(total=total, page=page, page_size=page_size, items=list(items))
