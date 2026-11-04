from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CountryOut(ORMModel):
    code: str
    name_en: str
    name_uk: str
    currency: str


class IndustryOut(ORMModel):
    slug: str
    name_en: str
    name_uk: str


class CostOfLivingYearOut(ORMModel):
    year: int
    price_level_index: float
    avg_net_earnings_eur: float
    purchasing_power_index: float
    source: str


class CostOfLivingRankOut(CostOfLivingYearOut):
    rank: int
    country: CountryOut


class CountryCostOfLivingOut(BaseModel):
    country: CountryOut
    latest: CostOfLivingYearOut
    history: list[CostOfLivingYearOut]


class VacancyOut(ORMModel):
    id: int
    source: str
    title: str
    company: str | None
    country_code: str
    city: str | None
    url: str
    remote: bool
    industry: IndustryOut | None
    salary_annual_min_eur: float | None
    salary_annual_max_eur: float | None
    posted_at: datetime
    other_sources: list[dict]


class VacancyPageOut(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[VacancyOut]


class HealthOut(BaseModel):
    status: str
    database: str
