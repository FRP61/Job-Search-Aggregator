from sqlalchemy import func, select

from app.models import Country, Industry
from app.seed import seed


async def test_health(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


async def test_lists_all_27_eu_countries_sorted(client):
    response = await client.get("/api/v1/countries")
    assert response.status_code == 200
    countries = response.json()
    assert len(countries) == 27
    names = [c["name_en"] for c in countries]
    assert names == sorted(names)
    greece = next(c for c in countries if c["code"] == "GR")
    assert greece == {"code": "GR", "name_en": "Greece", "name_uk": "Греція", "currency": "EUR"}


async def test_get_country_is_case_insensitive(client):
    response = await client.get("/api/v1/countries/pl")
    assert response.status_code == 200
    assert response.json()["currency"] == "PLN"


async def test_unknown_country_is_404(client):
    response = await client.get("/api/v1/countries/UA")
    assert response.status_code == 404


async def test_industries_keep_catalogue_order(client):
    response = await client.get("/api/v1/industries")
    assert response.status_code == 200
    slugs = [i["slug"] for i in response.json()]
    assert len(slugs) == 19
    assert slugs[0] == "it"
    assert slugs[-1] == "other"


async def test_seed_is_idempotent(session):
    await seed(session)
    await seed(session)
    assert await session.scalar(select(func.count()).select_from(Country)) == 27
    assert await session.scalar(select(func.count()).select_from(Industry)) == 19
