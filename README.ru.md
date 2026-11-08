# Job Search Aggregator

[English](README.md) | **Русский**

Поиск вакансий по странам ЕС с калькулятором «брутто → на руки», индексами стоимости жизни и тестом профориентации.

- `frontend/` — сайт на React (поиск, страницы вакансий, калькулятор зарплаты для 28 стран, тест). См. [frontend/README.ru.md](frontend/README.ru.md).
- `backend/` — API на FastAPI + PostgreSQL, интеграции с сайтами вакансий. См. [backend/README.ru.md](backend/README.ru.md).

## Запуск всего сайта (без Docker)

Нужны **Python 3.12+** и **Node.js 20+**. Первый запуск всё устанавливает сам (несколько минут).

| | Windows | macOS / Linux |
|---|---|---|
| Запустить сайт | двойной клик по `run-site.bat` | `./run-site.sh` |
| Загрузить вакансии | двойной клик по `load-vacancies.bat` | `./run-site.sh load` |

Сайт откроется на http://localhost:5173, документация API — http://localhost:8000/docs. Данные лежат в `backend/jobs.db` (SQLite).
Вакансии берутся из шести источников (Латвия, Эстония, Литва, Польша, Германия, Швеция) и сразу появляются в поиске; по остальным странам вакансий пока нет.

## Запуск через Docker

```bash
docker compose up --build        # сайт на http://localhost:3000
docker compose exec backend python -m app.cli refresh-source cv_lv
```

Источники для `refresh-source`: `cv_lv`, `cv_ee`, `cv_lt`, `justjoin`, `bundesagentur`, `jobtech`.
