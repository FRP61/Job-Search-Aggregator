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


class HealthOut(BaseModel):
    status: str
    database: str
