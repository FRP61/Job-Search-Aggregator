from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import Country
from app.schemas import CountryOut

router = APIRouter(prefix="/countries", tags=["countries"])


@router.get("", response_model=list[CountryOut])
async def list_countries(session: AsyncSession = Depends(get_session)):
    result = await session.scalars(select(Country).where(Country.is_active).order_by(Country.name_en))
    return result.all()


@router.get("/{code}", response_model=CountryOut)
async def get_country(code: str, session: AsyncSession = Depends(get_session)):
    country = await session.get(Country, code.upper())
    if country is None or not country.is_active:
        raise HTTPException(status_code=404, detail=f"Country {code.upper()} not found")
    return country
