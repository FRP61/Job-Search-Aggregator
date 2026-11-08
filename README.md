# Job Search Aggregator

**English** | [Русский](README.ru.md)

Job search across EU countries with a "gross → net" salary calculator, cost-of-living indexes and a career orientation test.

- `frontend/` — React site (search, vacancy pages, salary calculator for 28 countries, career test). See [frontend/README.md](frontend/README.md).
- `backend/` — FastAPI + PostgreSQL API, job-source integrations. See [backend/README.md](backend/README.md).

## Run the whole site (no Docker)

Needs **Python 3.12+** and **Node.js 20+**. The first run installs everything (a few minutes).

| | Windows | macOS / Linux |
|---|---|---|
| Start the site | double-click `run-site.bat` | `./run-site.sh` |
| Load vacancies | double-click `load-vacancies.bat` | `./run-site.sh load` |

The site opens at http://localhost:5173, the API docs are at http://localhost:8000/docs. Data is stored in `backend/jobs.db` (SQLite).
Vacancies are loaded from six sources (Latvia, Estonia, Lithuania, Poland, Germany, Sweden) and appear in the search right away; other countries have no vacancies yet.

## Run with Docker

```bash
docker compose up --build        # site on http://localhost:3000
docker compose exec backend python -m app.cli refresh-source cv_lv
```

Sources for `refresh-source`: `cv_lv`, `cv_ee`, `cv_lt`, `justjoin`, `bundesagentur`, `jobtech`.
