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


class HealthOut(BaseModel):
    status: str
    database: str
