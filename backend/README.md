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
  integrations/    джерела вакансій: EURES, Bundesagentur, довідник ESCO
  services/        розрахунки, класифікація, збереження вакансій, кеш
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
| GET | `/api/v1/vacancies` | пошук вакансій, див. нижче |
| GET | `/api/v1/vacancies/{id}` | одна вакансія з повним описом |

## Пошук вакансій

Показує вакансії, опубліковані за останні 30 днів, спочатку найновіші. Усі параметри необов'язкові.

| Параметр | Приклад | Опис |
|---|---|---|
| `country` | `?country=PL&country=GR` | одна або кілька країн; без параметра — усі |
| `industry` | `?industry=it` | `slug` галузі з `/industries` |
| `q` | `?q=python` | слово або фраза в назві чи компанії |
| `page`, `page_size` | `?page=2&page_size=50` | сторінка; `page_size` до 100, типово 20 |

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

Вакансія з кількох країн приходить один раз, усі країни — у `countries`. Повний опис є тільки
в `/vacancies/{id}`. Зарплати часто немає, а `city` немає у вакансій з EURES.

## Оновлення вакансій

Пошук читає нашу базу, тому вакансії треба оновлювати окремою командою, бажано раз на добу:

```bash
python -m app.cli refresh-all                                   # усі джерела
python -m app.cli refresh-source bundesagentur --max-pages 2    # одне джерело
python -m app.cli refresh-vacancies --country PL GR             # EURES за країнами
```

Сайти віддають обмежену кількість сторінок (EURES 200 на країну, Bundesagentur 100), тож один
запуск не бачить усіх вакансій великих країн. Щоденні запуски накопичують їх за 30 днів.

Галузь визначається за кодами ISCO/ESCO, якщо сайт їх дає, інакше за словами в назві. Відповіді
ESCO зберігаються в кеші на рік, тому перший запуск значно довший за наступні.

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
