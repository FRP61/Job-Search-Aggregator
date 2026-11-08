from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_session
from app.models import CostOfLivingIndex, Country
from app.schemas import CostOfLivingRankOut, CountryCostOfLivingOut, CostOfLivingYearOut, CountryOut

router = APIRouter(prefix="/cost-of-living", tags=["cost of living"])


@router.get("", response_model=list[CostOfLivingRankOut])
async def ranking(session: AsyncSession = Depends(get_session)):
    """Latest index of every country, best purchasing power first."""
    countries = await session.scalars(
        select(Country).where(Country.is_active).options(selectinload(Country.indices))
    )
    # Country.indices is ordered newest year first, so [0] is the latest
    latest = [(c, c.indices[0]) for c in countries if c.indices]
    latest.sort(key=lambda pair: pair[1].purchasing_power_index, reverse=True)
    return [
        CostOfLivingRankOut(
            rank=rank,
            country=CountryOut.model_validate(country),
            **CostOfLivingYearOut.model_validate(index).model_dump(),
        )
        for rank, (country, index) in enumerate(latest, start=1)
    ]


@router.get("/{code}", response_model=CountryCostOfLivingOut)
async def country_index(code: str, session: AsyncSession = Depends(get_session)):
    country = await session.scalar(
        select(Country)
        .where(Country.code == code.upper(), Country.is_active)
        .options(selectinload(Country.indices))
    )
    if country is None or not country.indices:
        raise HTTPException(status_code=404, detail=f"No cost of living data for {code.upper()}")
    return CountryCostOfLivingOut(
        country=CountryOut.model_validate(country),
        latest=CostOfLivingYearOut.model_validate(country.indices[0]),
        history=[CostOfLivingYearOut.model_validate(i) for i in country.indices],
    )
