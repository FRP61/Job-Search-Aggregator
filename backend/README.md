# Backend

**English** | [Русский](README.ru.md)

FastAPI + PostgreSQL. API documentation after starting: http://localhost:8000/docs

## Running with Docker (easiest)

```bash
docker compose up --build
```

Starts Postgres and the backend, applies the migrations and fills the reference data (countries, industries).

## Running without Docker

Needs Python 3.12+ and a running Postgres.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env          # set your DATABASE_URL
alembic upgrade head          # creates the tables
python -m app.seed            # fills countries and industries
uvicorn app.main:app --reload
```

## Tests

```bash
cd backend
pytest
```

Locally the tests run on SQLite, in GitHub Actions on real Postgres.

## Structure

```
app/
  main.py          FastAPI app, CORS, router registration
  config.py        settings from .env
  db.py            database connection, sessions
  models.py        tables (SQLAlchemy)
  schemas.py       API response formats (Pydantic)
  seed.py          fills the reference data
  data/            reference data: 27 EU countries, 19 industries
  integrations/    job sources (EURES, Bundesagentur, cv.ee/lv/lt, justjoin.it, JobTech), ESCO, ECB rates
  services/        calculations, classification, saving vacancies, cache
  api/routes/      endpoints
alembic/versions/  schema migrations
tests/
```

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | status of the service and database |
| GET | `/api/v1/countries` | the 27 EU countries |
| GET | `/api/v1/countries/{code}` | one country (`DE`, `pl`, ...) |
| GET | `/api/v1/industries` | list of industries |
| GET | `/api/v1/cost-of-living` | countries ranked by the purchasing power index |
| GET | `/api/v1/cost-of-living/{code}` | a country's index: the latest year and history |
| GET | `/api/v1/vacancies` | vacancy search, see below |
| GET | `/api/v1/vacancies/{id}` | one vacancy with its full description |

## Vacancy search

Shows vacancies published in the last 30 days, newest first. All parameters are optional.

| Parameter | Example | Description |
|---|---|---|
| `country` | `?country=PL&country=GR` | one or several countries; without it, all of them |
| `industry` | `?industry=it` | industry `slug` from `/industries` |
| `q` | `?q=python` | a word or phrase in the title or company |
| `page`, `page_size` | `?page=2&page_size=50` | page; `page_size` up to 100, 20 by default |

```json
{
  "total": 131,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": 1,
      "source": "eures",
      "title": "Senior Sales Manager",
      "company": "Volvo",
      "countries": ["AT", "ES", "IT"],
      "city": null,
      "url": "https://...",
      "remote": false,
      "industry": {"slug": "sales", "name_en": "Sales", "name_uk": "Продажі"},
      "salary_annual_min_eur": null,
      "salary_annual_max_eur": null,
      "posted_at": "2026-11-02T12:26:00+00:00",
      "other_sources": []
    }
  ]
}
```

A vacancy from several countries comes once, with all of them in `countries`. The full description is only in
`/vacancies/{id}`. The salary is often missing, and vacancies from EURES have no `city`.

## Refreshing vacancies

Search reads our database, so vacancies are refreshed by a separate command, ideally once a day:

```bash
python -m app.cli refresh-all                                   # every source
python -m app.cli refresh-source bundesagentur --max-pages 2    # one source
python -m app.cli refresh-vacancies --country PL GR             # EURES by country
```

Source names: `bundesagentur`, `cv_ee`, `cv_lv`, `cv_lt`, `justjoin`, `jobtech`. Salaries are converted to euros
using ECB rates, which are cached for a day.

Boards return a limited number of pages (EURES 200 per country, Bundesagentur 100), so one run doesn't see all
vacancies of large countries. Daily runs accumulate them over 30 days.

The industry comes from ISCO/ESCO codes if the board gives them, otherwise from words in the title. ESCO answers
are cached for a year, so the first run is much longer than the next ones.

## Cost-of-living index

```
index = (net earnings in the country / EU average) / (price level / 100) × 100
```

100 = the average EU worker; 113 = can buy 13% more. Eurostat data: `prc_ppp_ind` (price level, EU = 100) and
`earn_nt_net` (net earnings, EUR/year).

The database gets 2024 data right away from `app/data/cost_of_living.py`. To refresh from Eurostat (once a year,
when new data comes out):

```bash
python -m app.cli refresh-col --since 2020
```

## New migration after changing `models.py`

```bash
alembic revision --autogenerate -m "what changed"
```

Review the generated file in `alembic/versions/` before committing.
