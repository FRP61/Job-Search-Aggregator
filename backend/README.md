# Backend

FastAPI + PostgreSQL. Документація API після запуску: http://localhost:8000/docs

## Запуск через Docker (найпростіше)

```bash
docker compose up --build
```

Піднімає Postgres і бекенд, накочує міграції та довідники (країни, галузі).

## Запуск без Docker

Потрібні Python 3.12+ і запущений Postgres.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env          # вкажіть свій DATABASE_URL
alembic upgrade head          # створює таблиці
python -m app.seed            # заповнює країни та галузі
uvicorn app.main:app --reload
```

## Тести

```bash
cd backend
pytest
```

Локально тести йдуть на SQLite, у GitHub Actions — на справжньому Postgres.

## Структура

```
app/
  main.py          створення FastAPI, CORS, підключення роутерів
  config.py        налаштування з .env
  db.py            підключення до БД, сесії
  models.py        таблиці (SQLAlchemy)
  schemas.py       формати відповідей API (Pydantic)
  seed.py          заповнення довідників
  data/            довідники: 27 країн ЄС, 19 галузей
  api/routes/      ендпоінти
alembic/versions/  міграції схеми БД
tests/
```

## Ендпоінти

| Метод | Шлях | Опис |
|---|---|---|
| GET | `/api/v1/health` | стан сервісу і БД |
| GET | `/api/v1/countries` | 27 країн ЄС |
| GET | `/api/v1/countries/{code}` | одна країна (`DE`, `pl`, ...) |
| GET | `/api/v1/industries` | список галузей |

## Нова міграція після зміни `models.py`

```bash
alembic revision --autogenerate -m "що змінилось"
```

Перегляньте згенерований файл у `alembic/versions/` перед комітом.
