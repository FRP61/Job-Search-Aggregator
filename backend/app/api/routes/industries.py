from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import Industry
from app.schemas import IndustryOut

router = APIRouter(prefix="/industries", tags=["industries"])


@router.get("", response_model=list[IndustryOut])
async def list_industries(session: AsyncSession = Depends(get_session)):
    result = await session.scalars(select(Industry).order_by(Industry.sort_order))
    return result.all()
