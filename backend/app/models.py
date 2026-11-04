from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class Country(Base):
    __tablename__ = "countries"

    code: Mapped[str] = mapped_column(String(2), primary_key=True)  # ISO 3166-1 alpha-2
    name_en: Mapped[str] = mapped_column(String(100))
    name_uk: Mapped[str] = mapped_column(String(100))
    currency: Mapped[str] = mapped_column(String(3))
    eurostat_code: Mapped[str] = mapped_column(String(10))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    indices: Mapped[list["CostOfLivingIndex"]] = relationship(
        back_populates="country", order_by="CostOfLivingIndex.year.desc()"
    )


class Industry(Base):
    __tablename__ = "industries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(50), unique=True)
    name_en: Mapped[str] = mapped_column(String(100))
    name_uk: Mapped[str] = mapped_column(String(100))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class CostOfLivingIndex(Base):
    __tablename__ = "cost_of_living_indices"
    __table_args__ = (UniqueConstraint("country_code", "year", name="uq_col_country_year"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    country_code: Mapped[str] = mapped_column(ForeignKey("countries.code", ondelete="CASCADE"))
    year: Mapped[int] = mapped_column(Integer)
    # Eurostat price level index of actual individual consumption, EU27 = 100
    price_level_index: Mapped[float] = mapped_column(Float)
    # Annual net earnings of a single worker on the average wage, EUR
    avg_net_earnings_eur: Mapped[float] = mapped_column(Float)
    # Net earnings relative to the EU average, deflated by price level. EU27 = 100
    purchasing_power_index: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    country: Mapped[Country] = relationship(back_populates="indices")


class Vacancy(Base):
    __tablename__ = "vacancies"
    __table_args__ = (
        # EURES lists one job under several countries, and each country gets its own row
        UniqueConstraint("source", "external_id", "country_code", name="uq_vacancy_source_external_country"),
        Index("ix_vacancy_search", "country_code", "industry_id", "posted_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source: Mapped[str] = mapped_column(String(30))
    external_id: Mapped[str] = mapped_column(String(255))
    # sha1 of normalized title/company/country/city, used for cross-source dedup
    fingerprint: Mapped[str] = mapped_column(String(40), unique=True)
    # The same without the city, to find a job on a board that doesn't give one
    loose_fingerprint: Mapped[str | None] = mapped_column(String(40), index=True)

    title: Mapped[str] = mapped_column(String(500))
    company: Mapped[str | None] = mapped_column(String(255))
    country_code: Mapped[str] = mapped_column(ForeignKey("countries.code"))
    industry_id: Mapped[int | None] = mapped_column(ForeignKey("industries.id"), index=True)
    city: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    url: Mapped[str] = mapped_column(String(2000))
    remote: Mapped[bool] = mapped_column(Boolean, default=False)
    employment_type: Mapped[str | None] = mapped_column(String(50))

    salary_min: Mapped[float | None] = mapped_column(Float)
    salary_max: Mapped[float | None] = mapped_column(Float)
    salary_currency: Mapped[str | None] = mapped_column(String(3))
    salary_period: Mapped[str | None] = mapped_column(String(10))  # year | month | day | hour
    salary_is_estimated: Mapped[bool] = mapped_column(Boolean, default=False)
    salary_annual_min_eur: Mapped[float | None] = mapped_column(Float)
    salary_annual_max_eur: Mapped[float | None] = mapped_column(Float)

    # Same vacancy seen on other boards: [{"source": ..., "url": ...}]
    other_sources: Mapped[list[dict]] = mapped_column(JSON, default=list)

    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    country: Mapped[Country] = relationship()
    industry: Mapped[Industry | None] = relationship()


class ApiCache(Base):
    __tablename__ = "api_cache"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload: Mapped[dict | list | None] = mapped_column(JSON)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
