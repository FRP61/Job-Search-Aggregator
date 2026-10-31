import pytest

from app.config import Settings


@pytest.mark.parametrize(
    ("given", "expected"),
    [
        ("postgres://u:p@host/db", "postgresql+asyncpg://u:p@host/db"),
        ("postgresql://u:p@host/db?sslmode=require", "postgresql+asyncpg://u:p@host/db?ssl=require"),
        ("postgresql+asyncpg://u:p@host/db", "postgresql+asyncpg://u:p@host/db"),
        ("sqlite+aiosqlite:///x.db", "sqlite+aiosqlite:///x.db"),
    ],
)
def test_database_url_gets_async_driver(given, expected):
    assert Settings(database_url=given).database_url == expected


def test_cors_origins_from_comma_separated_string():
    settings = Settings(cors_origins="https://a.com, https://b.com")
    assert settings.cors_origins == ["https://a.com", "https://b.com"]
