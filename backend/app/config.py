import json
from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Job Search Aggregator API"
    environment: str = "development"

    database_url: str = "postgresql+asyncpg://jobs:jobs@localhost:5432/jobs"
    # NoDecode: without it the value is read as JSON first, and a comma-separated list crashes
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000", "http://localhost:5173"]

    @field_validator("database_url")
    @classmethod
    def _async_driver(cls, value: str) -> str:
        # Hosting providers hand out plain postgres:// URLs; SQLAlchemy needs the asyncpg driver.
        if value.startswith("postgres://"):
            value = "postgresql://" + value.removeprefix("postgres://")
        if value.startswith("postgresql://"):
            value = "postgresql+asyncpg://" + value.removeprefix("postgresql://")
        if value.startswith("postgresql+asyncpg://"):
            # asyncpg calls the libpq "sslmode" parameter "ssl"
            value = value.replace("sslmode=", "ssl=")
        return value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value):
        # Allows CORS_ORIGINS=https://a.com,https://b.com in .env, or a JSON list
        if not isinstance(value, str):
            return value
        if value.startswith("["):
            return json.loads(value)
        return [origin.strip() for origin in value.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
