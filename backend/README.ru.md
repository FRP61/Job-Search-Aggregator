# Backend

[English](README.md) | **Русский**

FastAPI + PostgreSQL. Документация API после запуска: http://localhost:8000/docs

## Запуск через Docker (проще всего)

```bash
docker compose up --build
```

Поднимает Postgres и бекенд, применяет миграции и заполняет справочники (страны, отрасли).

## Запуск без Docker

Нужны Python 3.12+ и запущенный Postgres.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env          # укажите свой DATABASE_URL
alembic upgrade head          # создаёт таблицы
python -m app.seed            # заполняет страны и отрасли
uvicorn app.main:app --reload
```

## Тесты

```bash
cd backend
pytest
```

Локально тесты идут на SQLite, в GitHub Actions на настоящем Postgres.

## Структура

```
app/
  main.py          создание FastAPI, CORS, подключение роутеров
  config.py        настройки из .env
  db.py            подключение к базе, сессии
  models.py        таблицы (SQLAlchemy)
  schemas.py       форматы ответов API (Pydantic)
  seed.py          заполнение справочников
  data/            справочники: 27 стран ЕС, 19 отраслей
  integrations/    источники вакансий (EURES, Bundesagentur, cv.ee/lv/lt, justjoin.it, JobTech), ESCO, курсы ЕЦБ
  services/        расчёты, классификация, сохранение вакансий, кэш
  api/routes/      эндпоинты
alembic/versions/  миграции схемы базы
tests/
```

## Эндпоинты

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/v1/health` | состояние сервиса и базы |
| GET | `/api/v1/countries` | 27 стран ЕС |
| GET | `/api/v1/countries/{code}` | одна страна (`DE`, `pl`, ...) |
| GET | `/api/v1/industries` | список отраслей |
| GET | `/api/v1/cost-of-living` | рейтинг стран по индексу покупательной способности |
| GET | `/api/v1/cost-of-living/{code}` | индекс страны: последний год и история |
| GET | `/api/v1/vacancies` | поиск вакансий, см. ниже |
| GET | `/api/v1/vacancies/{id}` | одна вакансия с полным описанием |

## Поиск вакансий

Показывает вакансии, опубликованные за последние 30 дней, сначала самые новые. Все параметры необязательные.

| Параметр | Пример | Описание |
|---|---|---|
| `country` | `?country=PL&country=GR` | одна или несколько стран; без параметра все |
| `industry` | `?industry=it` | `slug` отрасли из `/industries` |
| `q` | `?q=python` | слово или фраза в названии или компании |
| `page`, `page_size` | `?page=2&page_size=50` | страница; `page_size` до 100, по умолчанию 20 |

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

Вакансия из нескольких стран приходит один раз, все страны указаны в `countries`. Полное описание есть только
в `/vacancies/{id}`. Зарплаты часто нет, а `city` нет у вакансий из EURES.

## Обновление вакансий

Поиск читает нашу базу, поэтому вакансии обновляются отдельной командой, желательно раз в сутки:

```bash
python -m app.cli refresh-all                                   # все источники
python -m app.cli refresh-source bundesagentur --max-pages 2    # один источник
python -m app.cli refresh-vacancies --country PL GR             # EURES по странам
```

Названия источников: `bundesagentur`, `cv_ee`, `cv_lv`, `cv_lt`, `justjoin`, `jobtech`. Зарплаты пересчитываются
в евро по курсам ЕЦБ, которые хранятся в кэше на день.

Сайты отдают ограниченное число страниц (EURES 200 на страну, Bundesagentur 100), поэтому один запуск не видит
всех вакансий крупных стран. Ежедневные запуски накапливают их за 30 дней.

Отрасль определяется по кодам ISCO/ESCO, если сайт их даёт, иначе по словам в названии. Ответы ESCO хранятся
в кэше год, поэтому первый запуск заметно дольше следующих.

## Индекс стоимости жизни

```
индекс = (чистая зарплата в стране / средняя по ЕС) / (уровень цен / 100) × 100
```

100 = средний работник ЕС; 113 = можно купить на 13% больше. Данные Eurostat: `prc_ppp_ind` (уровень цен, ЕС = 100)
и `earn_nt_net` (чистая зарплата, EUR/год).

База сразу получает данные за 2024 год из `app/data/cost_of_living.py`. Обновить из Eurostat (раз в год, когда
выходят новые данные):

```bash
python -m app.cli refresh-col --since 2020
```

## Новая миграция после изменения `models.py`

```bash
alembic revision --autogenerate -m "что изменилось"
```

Просмотрите созданный файл в `alembic/versions/` перед коммитом.
