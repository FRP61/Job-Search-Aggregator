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
| GET | `/api/v1/cost-of-living` | рейтинг країн за індексом купівельної спроможності |
| GET | `/api/v1/cost-of-living/{code}` | індекс країни: останній рік та історія |

## Індекс вартості життя

```
індекс = (чиста зарплата в країні / середня по ЄС) / (рівень цін / 100) × 100
```

100 = середній працівник ЄС; 113 = можна купити на 13% більше. Дані Eurostat:
`prc_ppp_ind` (рівень цін, ЄС = 100) і `earn_nt_net` (чиста зарплата, EUR/рік).

База одразу отримує дані за 2024 рік із `app/data/cost_of_living.py`. Оновити з Eurostat
(раз на рік, коли виходять нові дані):

```bash
python -m app.cli refresh-col --since 2020
```

## Нова міграція після зміни `models.py`

```bash
alembic revision --autogenerate -m "що змінилось"
```

Перегляньте згенерований файл у `alembic/versions/` перед комітом.
