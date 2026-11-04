# Бекенд: полная структура

[English](BACKEND.md) | **Русский**

Что делает каждая часть кода, почему она так устроена, какие функции и параметры использует.
Пути указаны от папки `backend/`.

## Общая логика

Есть два независимых процесса:

1. **Обновление** (команда раз в сутки): сайт → адаптер → `NormalizedVacancy` → отрасль и зарплата → сохранение без дублей → база.
2. **Поиск** (запрос пользователя): API → база → ответ.

**Почему так:** сайты медленные и иногда не отвечают. Если бы поиск обращался к ним напрямую, пользователь ждал
бы десятки секунд, а сбой одного сайта ломал бы ответ.

## Слои кода

| Папка | Отвечает за | Почему отдельно |
|---|---|---|
| `app/api/routes/` | HTTP: параметры запроса, ответы | Логика не зависит от веба |
| `app/integrations/` | Внешние сервисы, каждый в своём файле | Новый сайт не меняет остальной код |
| `app/services/` | Правила: зарплаты, отрасли, дубли | Проверяются тестами без сети |
| `app/data/` | Справочники в коде | Данные отделены от логики |
| `alembic/` | Изменения схемы базы | Схему можно воссоздать и откатить |

---

## Основа приложения

### `app/main.py`
Создаёт приложение FastAPI, включает CORS и подключает роутеры под префиксом `API_PREFIX = "/api/v1"`.
Версия в пути позволит когда-нибудь изменить API, не ломая фронтенд.

### `app/config.py`
`Settings` читает настройки из переменных окружения и `.env`.

| Параметр | Зачем |
|---|---|
| `database_url` | Адрес базы |
| `cors_origins` | С каких сайтов фронтенд может обращаться к API |
| `app_name`, `environment` | Название и тип окружения |

- `_async_driver(cls, value)` превращает `postgres://` в `postgresql+asyncpg://`, потому что хостинги дают обычные адреса, а код асинхронный.
- `_split_origins(cls, value)` принимает список через запятую или JSON.
- `get_settings()` кэширует настройки через `lru_cache`, чтобы не читать их каждый раз.

### `app/db.py`
- `Base` — базовый класс таблиц.
- `get_session()` выдаёт сессию базы на один запрос и сама её закрывает.

### `app/models.py`
Таблицы базы. `utcnow()` возвращает текущее время в UTC.

| Таблица | Что хранит |
|---|---|
| `Country` | Страны: `code`, `name_en`, `name_uk`, `currency`, `eurostat_code`, `is_active` |
| `Industry` | Отрасли: `slug`, `name_en`, `name_uk`, `sort_order` |
| `CostOfLivingIndex` | Индекс по стране и году |
| `Vacancy` | Вакансии |
| `ApiCache` | Кэш: `key`, `payload`, `expires_at` |

Ключевые решения в `Vacancy`:

| Поле или правило | Почему |
|---|---|
| Уникальные `source` + `external_id` + `country_code` | EURES показывает одну вакансию в нескольких странах, у каждой страны своя строка |
| `fingerprint` (уникальный) | Отпечаток названия, компании, страны и места для поиска дублей |
| `loose_fingerprint` | Тот же отпечаток без места, потому что не каждый сайт даёт город |
| `other_sources` | Ссылки на ту же вакансию на других сайтах |
| `salary_annual_min_eur`, `salary_annual_max_eur` | Единая шкала для сравнения зарплат |
| Индекс `ix_vacancy_search` | Быстрый поиск по стране, отрасли и дате |

### `app/schemas.py`
Формат ответов API (Pydantic): `CountryOut`, `IndustryOut`, `CostOfLivingYearOut`, `CostOfLivingRankOut`,
`CountryCostOfLivingOut`, `VacancyOut`, `VacancyDetailOut`, `VacancyPageOut`, `HealthOut`. Схемы отделены от таблиц,
чтобы служебные поля вроде `fingerprint` не попадали в ответ. `ORMModel` — общая основа, которая позволяет строить схему прямо из строки таблицы.

### `app/seed.py`
`seed(session)` заполняет страны, отрасли и базовый индекс. Безопасно запускать много раз: существующие строки обновляются, дубли не создаются.

### `app/cli.py`
Команды обслуживания. `main()` разбирает аргументы и запускает нужную.

| Команда | Функция | Параметры |
|---|---|---|
| `refresh-all` | `refresh_everything()` | нет |
| `refresh-vacancies` | `refresh_vacancies(country_codes, max_pages)` | `--country PL GR`, `--max-pages` |
| `refresh-source` | `refresh_one_source(name, max_pages)` | название источника, `--max-pages` |
| `refresh-col` | `refresh_col(since)` | `--since 2020` |

`print_save_result(result)` печатает итог.

---

## Единый формат вакансии: `app/integrations/base.py`

Каждый адаптер превращает данные сайта в `NormalizedVacancy`, поэтому остальной код не знает об особенностях сайтов.

| Поле | Значение |
|---|---|
| `source`, `external_id` | Источник и id на нём |
| `title`, `url`, `country_code` | Обязательные поля |
| `posted_at` | **Обязательная дата.** Вакансия без даты не попадает в базу |
| `company`, `description`, `city`, `remote` | Необязательные данные |
| `location` | Место, если нет города, например код региона |
| `industry` | `slug` отрасли |
| `salary_min`, `salary_max`, `salary_currency`, `salary_period` | Зарплата как на сайте |
| `fingerprint`, `loose_fingerprint` | Заполняются автоматически |
| `match_title` | Название в том виде, как его пишет другой сайт |
| `occupation_uris` | Ссылки на профессии ESCO, которые ещё надо проверить |

| Функция | Что делает | Почему |
|---|---|---|
| `is_too_old(self, now, max_age_days=30)` | Прошло ли больше 30 дней | Единое правило свежести |
| `fill_computed_fields(vacancy)` | Угадывает отрасль, если её нет, считает отпечатки | Без компании отпечаток содержит id, потому что название и город не определяют вакансию |
| `annual_min_eur(vacancy, rates)`, `annual_max_eur(vacancy, rates)` | Зарплата в евро за год | Единая шкала |
| `collect_pages(fetch_page, parse, count_raw_jobs, page_size, max_pages, pause_seconds)` | Читает сайт страница за страницей | Общий цикл для всех адаптеров |

Поведение `collect_pages`: неполная страница означает конец; пауза только между страницами; временный сбой повторяется один раз через `_fetch_with_retry(fetch_page, page)`, а `_is_temporary(error)` решает, что считать временным (обрыв соединения или 5xx, но не 400 за лимитом страниц); затем ошибка на первой странице передаётся дальше, а на следующих сохраняется уже прочитанное.

| Константа | Зачем |
|---|---|
| `MAX_VACANCY_AGE_DAYS = 30` | Срок актуальности |
| `JOB_PARSE_ERRORS` | Ошибки сломанной вакансии: пропускается одна, а не вся страница |
| `REQUEST_ERRORS` | Ошибки запроса и ответ не в JSON, например страница техработ со статусом 200 |

---

## Адаптеры: `app/integrations/`

Все построены одинаково: `parse_*_job` разбирает одну вакансию, `parse_*_response` разбирает ответ и пропускает сломанные, `fetch_*` загружает.

### `eures.py`: EURES, 27 стран
Общеевропейский портал и основной источник.

| Функция | Что делает |
|---|---|
| `eures_location_code(country_code)` | Код страны для запроса: у Греции в EURES код `el`, а не `gr` |
| `build_eures_search_body(country_code, page)` | Тело запроса, включая фильтр `LAST_MONTH` |
| `fetch_eures_page(client, country_code, page)` | Одна страница |
| `fetch_eures_country(client, country_code, max_pages=200, pause_seconds=0.2)` | Все страницы страны |
| `eures_posted_at(job)` | Дата из миллисекунд в UTC |
| `eures_industry(job)` | Отрасль по кодам ISCO |
| `eures_occupation_uris(job)` | Ссылки на профессии ESCO |
| `eures_location(job, country_code)` | Коды регионов, чтобы филиалы не считались дублями |
| `parse_eures_job(job, country_code)`, `parse_eures_response(data, country_code)` | Разбор |

**Почему дата проверяется ещё раз:** фильтр `LAST_MONTH` пропускает старые вакансии, если их недавно меняли.
`EURES_MAX_PAGES = 200`, потому что страница 201 возвращает ошибку 400.

### `bundesagentur.py`: Германия
| Функция | Что делает |
|---|---|
| `fetch_ba_page(client, page)`, `fetch_ba_jobs(client, max_pages=100, pause_seconds=0.2)` | Загрузка, заголовок `X-API-Key` обязателен |
| `ba_address(job)`, `ba_posted_at(job)` | Адрес и дата |
| `ba_title(job)` | Название; у учебных мест его может не быть, тогда берётся профессия |
| `ba_industry(job)` | Отрасль по названию, затем по профессии |
| `ba_match_title(job)` | Название как в EURES: `название (профессия)`, чтобы находить копии |
| `parse_ba_job(job)`, `parse_ba_response(data)` | Разбор, вакансии за границей пропускаются |

### `cv.py`: Эстония, Латвия, Литва
У трёх сайтов одинаковый API, поэтому один код и три настройки `CvSite(source, search_url, job_url, country_code, country_id)`: `CV_EE`, `CV_LV`, `CV_LT`.

- `cv_industry(job)` берёт отрасль из `CV_CATEGORY_TO_INDUSTRY`: номера категорий найдены перебором фильтров сайта.
- `parse_cv_job(job, site)`, `parse_cv_response(data, site)` разбирают данные; вакансии из других стран пропускаются.
- `fetch_cv_jobs(client, max_pages=20, pause_seconds=0.2, *, site)` загружает; `fetch_cv_ee`, `fetch_cv_lv`, `fetch_cv_lt` — та же функция с готовым `site`.

Город приходит только номером, поэтому хранится как `location="town:314"`: показать нельзя, но филиалы различаются.

### `justjoin.py`: IT-вакансии Польши
- `jj_salary(job)` берёт зарплату в валюте работодателя, потому что сайт добавляет свои пересчёты в другие валюты.
- `parse_jj_job(job)`, `parse_jj_response(data)` разбирают данные.
- `fetch_jj_jobs(client, max_pages=100, pause_seconds=0.2)` загружает.

**Важно:** сумма берётся из `fromPerUnit`, а не `from`. Поле `from` уже пересчитано в месяц, и 17 USD в час выглядели бы как 2856 в час, то есть миллионы в год.

### `jobtech.py`: Швеция
- `parse_jt_job(job)`, `parse_jt_response(data)` разбирают данные; удалённые и зарубежные вакансии пропускаются.
- `fetch_jt_jobs(client, max_pages=21, pause_seconds=0.2)` загружает самые новые за 30 дней.
- `JT_FIELD_TO_INDUSTRY` сопоставляет профессиональные сферы сайта с нашими отраслями.

### `esco.py`: код профессии
У большинства вакансий EURES не код ISCO, а ссылка на профессию ESCO. Её код начинается с ISCO: `3313.2` → `3313`.

| Функция | Что делает |
|---|---|
| `fetch_isco_code(client, uri)` | Запрашивает код одной профессии |
| `resolve_isco_codes(session, client, uris, pause_seconds=0.2)` | Запрашивает только то, чего нет в кэше |
| `apply_occupation_industries(session, client, vacancies, pause_seconds=0.2)` | Заменяет угаданную отрасль более точной |

Запрос идёт больше секунды, поэтому ответы хранятся 365 дней. Сломанная ссылка пропускается, потому что некоторые ссылки всегда отвечают 500. После `ESCO_MAX_FAILURES_IN_A_ROW = 3` сбоев подряд запросы останавливаются, а вакансии остаются с отраслью по названию.

### `ecb.py`: курсы валют
- `parse_ecb_rates(xml_text)` разбирает XML банка.
- `get_exchange_rates(session, client)` берёт курсы из кэша на день; при ошибке возвращает пустой словарь и предупреждение. Зарплаты в евро при этом всё равно считаются.

---

## Правила: `app/services/`

### `salary.py`
- `to_annual(amount, period)` переводит в годовую сумму по `PERIODS_PER_YEAR` (`year`, `month`, `week`, `day`, `hour`).
- `to_eur(amount, currency, rates)` переводит в евро.

Обе возвращают `None`, когда данных нет, вместо ошибки: зарплата часто отсутствует, и это нормально.

### `normalize.py`
- `normalize_title(title)`: нижний регистр, без пометок вроде `(m/w/d)`.
- `normalize_company(company)`: без юридических форм `GmbH`, `sp. z o.o.`.
- `fingerprint(title, company, country_code, city)`: sha1 нормализованных значений.

Так одинаковые вакансии с разным написанием получают одинаковый отпечаток.

### `classify.py`
- `matches_keyword(title, keyword)` поддерживает четыре вида ключевых слов:

| Вид | Пример | Означает |
|---|---|---|
| Слово | `python` | Целое слово |
| Фраза | `data scientist` | Целые слова подряд |
| Начало | `entwickl*` | Слово начинается так |
| Часть | `*buchhalt*` | Где угодно, для немецких составных слов |

- `classify_industry(title)` возвращает первую отрасль с совпадением или `other`.
- `industry_from_isco(code)` берёт самый точный префикс: `52` — это розница, а `5244` — колл-центр.

### `vacancies.py`: сохранение
`save_vacancies(session, vacancies, rates)` решает судьбу каждой вакансии:

| Ситуация | Действие | Счётчик |
|---|---|---|
| Те же `source`, id и страна уже есть | Обновить строку | `updated` |
| Новая запись без совпадений | Вставить | `inserted` |
| Тот же отпечаток у строки старше 30 дней, а вакансия свежая | Строка становится новой публикацией | `updated` |
| Тот же отпечаток, тот же сайт, оба текста есть и они разные | Другая вакансия: новая строка, в отпечаток которой входит текст | `inserted` |
| Тот же отпечаток, тот же сайт, текст тот же или его нет | Пропустить | `skipped` |
| Тот же отпечаток, другой сайт | Добавить ссылку | `merged` |
| Другой сайт, нет города для сравнения, даты в пределах 3 дней, копии с этого сайта ещё нет | Добавить ссылку | `merged` |

Вспомогательные функции:

| Функция | Что делает |
|---|---|
| `_load_industry_ids(session)` | Словарь `slug` → id отрасли |
| `_load_existing_rows(session, vacancies)` | Один запрос вместо отдельного на каждую вакансию |
| `_row_key(source, external_id, country_code)` | Идентичность строки |
| `_copy_fields(row, vacancy, industry_id, rates)` | Переносит поля, обрезает текст под размер колонок, считает зарплату |
| `_plausible_salary(annual_eur)` | Скрывает годовые зарплаты вне диапазона 1 000–1 000 000 евро |
| `_as_utc(moment)` | Выравнивает часовой пояс между базами |
| `_published_close_together(row, vacancy)` | Даты в пределах `COPY_MAX_DAYS_APART = 3` |
| `_is_repost_of_expired_row(row, vacancy, now)` | Новая ли это публикация устаревшей вакансии |
| `_find_twin_without_city(rows, vacancy)` | Копия на другом сайте без города; строка принимает только одну копию с каждого сайта |
| `_add_other_source(twin, vacancy)` | Добавляет ссылку без повторов |

Функции обновления:

| Функция | Что делает |
|---|---|
| `save_in_batches(session, vacancies, rates)` | Сохраняет частями по `SAVE_BATCH_SIZE = 1000`, потому что один запрос не примет десятки тысяч значений |
| `refresh_eures(session, client, country_codes=None, max_pages=200, pause_seconds=0.2)` | EURES по странам; сбой страны записывается в `failed`, остальные продолжают |
| `refresh_source(session, client, name, max_pages=None, rates=None)` | Один источник из словаря `SOURCES` |
| `refresh_all(session, client)` | Все источники: национальные сайты раньше EURES, потому что они дают город |

`SaveResult` считает `inserted`, `updated`, `merged`, `skipped`, `failed`; метод `add(other)` суммирует результаты.

### `cache.py`
- `cache_key(text)`: sha256, чтобы любой текст помещался в колонку на 64 символа.
- `cache_get_many(session, keys)`: сохранённые и не просроченные значения.
- `cache_set(session, key, payload, ttl_days)`: сохраняет сразу, чтобы прерванный запуск не терял уже полученное.

### `cost_of_living.py`
```
индекс = (чистая зарплата в стране / средняя по ЕС) / (уровень цен / 100) × 100
```

| Функция | Что делает |
|---|---|
| `purchasing_power_index(net_earnings, price_level, eu_net_earnings)` | Формула |
| `parse_jsonstat(payload)` | Разбирает формат Eurostat |
| `_fetch_dataset(client, query, geos, since_year)` | Загружает один набор данных |
| `refresh_from_eurostat(session, client, since_year=2020)` | Обновляет индекс; сохраняет только годы с полными данными |
| `load_baseline(session)` | Начальные данные, чтобы новая база сразу имела индекс |

`RefreshResult` возвращает результат обновления: `saved`, `years`, `countries_without_data`.

---

## API: `app/api/routes/`

| Файл | Функция | Эндпоинт |
|---|---|---|
| `health.py` | `health(session)` | `GET /health` |
| `countries.py` | `list_countries(session)` | `GET /countries` |
| `countries.py` | `get_country(code, session)` | `GET /countries/{code}` |
| `industries.py` | `list_industries(session)` | `GET /industries` |
| `cost_of_living.py` | `ranking(session)` | `GET /cost-of-living` |
| `cost_of_living.py` | `country_index(code, session)` | `GET /cost-of-living/{code}` |
| `vacancies.py` | `list_vacancies(country, industry, q, page, page_size, session)` | `GET /vacancies` |
| `vacancies.py` | `get_vacancy(vacancy_id, session)` | `GET /vacancies/{id}` |

Параметры поиска `list_vacancies`:

| Параметр | Значение | Описание |
|---|---|---|
| `country` | список, необязательный | Без него ищет во всех странах |
| `industry` | `slug`, необязательный | Отрасль |
| `q` | строка, необязательная | Название или компания, символы `%` и `_` — обычный текст |
| `page` | от 1 | Страница |
| `page_size` | 1–100, по умолчанию 20 | Размер страницы |

Вспомогательные функции:
- `_search_filters(countries, now, industry=None, keyword=None)` строит условия поиска, в том числе правило 30 дней.
- `_load_countries(session, rows, now)` собирает все страны вакансии.

**Почему группировка:** вакансия из нескольких стран хранится несколькими строками, а показывается один раз. Запрос группирует строки по `source` + `external_id`, поэтому `total` и страницы считают вакансии, а не строки.

---

## Справочники: `app/data/`

| Файл | Содержимое |
|---|---|
| `countries.py` | `CountryDef`, `COUNTRIES`, `COUNTRY_BY_CODE`: 27 стран ЕС |
| `industries.py` | `IndustryDef`, `INDUSTRIES`, `INDUSTRY_BY_SLUG`: 19 отраслей с ключевыми словами; `ISCO_TO_INDUSTRY`: коды ISCO → отрасль |
| `cost_of_living.py` | `BASELINE`, `BASELINE_YEAR`, `EU_NET_EARNINGS_EUR`: базовый индекс |

## Миграции: `alembic/versions/`

| Миграция | Что делает |
|---|---|
| `0001_initial_schema` | Все таблицы |
| `0002_vacancy_unique_per_country` | Отдельная строка вакансии на каждую страну |
| `0003_vacancy_loose_fingerprint` | Отпечаток без города |

## Тесты: `tests/`

Тесты используют поддельные ответы сайтов через `respx`, поэтому не требуют интернета, а примеры данных взяты из реальных ответов. Локально они идут на SQLite, в CI на PostgreSQL. CI также применяет миграции и проверяет, что они совпадают с моделями.

## Как добавить новый источник

1. Создать `app/integrations/название.py` с `parse_*_job`, `parse_*_response`, `fetch_*`.
2. Для загрузки использовать `collect_pages`.
3. Добавить функцию в `SOURCES` в `app/services/vacancies.py`.
4. Написать тесты на реальном ответе сайта.
5. Проверить даты, зарплаты, лимит страниц и ссылки на вакансию на настоящих данных.
