"""Keep answers from slow outside services in the api_cache table."""

from datetime import timedelta
from hashlib import sha256

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ApiCache, utcnow


def cache_key(text: str) -> str:
    """Any text as a key of 64 characters, the size of the key column."""
    return sha256(text.encode()).hexdigest()


async def cache_get_many(session: AsyncSession, keys: list[str]) -> dict[str, dict]:
    """Key -> saved value, for the keys that are saved and not expired."""
    rows = await session.scalars(select(ApiCache).where(ApiCache.key.in_(keys), ApiCache.expires_at > utcnow()))
    return {row.key: row.payload for row in rows}


async def cache_set(session: AsyncSession, key: str, payload: dict, ttl_days: int) -> None:
    """Save a value right away, so an interrupted run keeps what it has learned."""
    expires_at = utcnow() + timedelta(days=ttl_days)
    await session.merge(ApiCache(key=key, payload=payload, expires_at=expires_at))
    await session.commit()
