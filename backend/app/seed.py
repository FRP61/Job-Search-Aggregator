"""Fill reference tables (countries, industries). Safe to run on every deploy:
existing rows are updated in place, nothing is duplicated.

    python -m app.seed
"""

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.countries import COUNTRIES
from app.data.industries import INDUSTRIES
from app.db import SessionLocal
from app.models import Country, Industry


async def seed(session: AsyncSession) -> None:
    for c in COUNTRIES:
        await session.merge(
            Country(
                code=c.code,
                name_en=c.name_en,
                name_uk=c.name_uk,
                currency=c.currency,
                eurostat_code=c.eurostat_code,
                is_active=True,
            )
        )

    existing = {i.slug: i for i in await session.scalars(select(Industry))}
    for order, ind in enumerate(INDUSTRIES):
        row = existing.get(ind.slug) or Industry(slug=ind.slug)
        row.name_en = ind.name_en
        row.name_uk = ind.name_uk
        row.sort_order = order
        session.add(row)

    await session.commit()


async def main() -> None:
    async with SessionLocal() as session:
        await seed(session)
    print(f"Seeded {len(COUNTRIES)} countries and {len(INDUSTRIES)} industries")


if __name__ == "__main__":
    asyncio.run(main())
