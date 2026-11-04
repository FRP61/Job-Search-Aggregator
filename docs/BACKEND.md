# Backend: full structure

**English** | [Русский](BACKEND.ru.md)

What each part of the code does, why it's built that way, and which functions and parameters it uses.
Paths are relative to `backend/`.

## Overall logic

There are two independent processes:

1. **Refresh** (a command, once a day): board → adapter → `NormalizedVacancy` → industry and salary → saving without duplicates → database.
2. **Search** (a user request): API → database → response.

**Why:** boards are slow and sometimes fail. If search contacted them directly, users would wait for tens of
seconds, and one failing board would break the response.

## Code layers

| Folder | Responsible for | Why separate |
|---|---|---|
| `app/api/routes/` | HTTP: request parameters, responses | Logic doesn't depend on the web layer |
| `app/integrations/` | Outside services, one file each | A new board doesn't change the rest of the code |
| `app/services/` | Rules: salaries, industries, duplicates | Testable without a network |
| `app/data/` | Reference data in code | Data is separate from logic |
| `alembic/` | Database schema changes | The schema can be recreated and rolled back |

---

## Application core

### `app/main.py`
Creates the FastAPI app, enables CORS and registers the routers under `API_PREFIX = "/api/v1"`.
A version in the path allows changing the API later without breaking the frontend.

### `app/config.py`
`Settings` reads settings from environment variables and `.env`.

| Parameter | Purpose |
|---|---|
| `database_url` | Database address |
| `cors_origins` | Which sites the frontend may call the API from |
| `app_name`, `environment` | Name and type of the environment |

- `_async_driver(cls, value)` turns `postgres://` into `postgresql+asyncpg://`, because hosts give plain addresses and the code is asynchronous.
- `_split_origins(cls, value)` accepts a comma-separated list or JSON.
- `get_settings()` caches the settings with `lru_cache`, so they aren't read every time.

### `app/db.py`
- `Base` is the base class of the tables.
- `get_session()` gives one database session per request and closes it.

### `app/models.py`
The database tables. `utcnow()` returns the current time in UTC.

| Table | What it stores |
|---|---|
| `Country` | Countries: `code`, `name_en`, `name_uk`, `currency`, `eurostat_code`, `is_active` |
| `Industry` | Industries: `slug`, `name_en`, `name_uk`, `sort_order` |
| `CostOfLivingIndex` | The index by country and year |
| `Vacancy` | Vacancies |
| `ApiCache` | Cache: `key`, `payload`, `expires_at` |

Key decisions in `Vacancy`:

| Field or rule | Why |
|---|---|
| Unique `source` + `external_id` + `country_code` | EURES lists one job in several countries, and each country has its own row |
| `fingerprint` (unique) | A fingerprint of title, company, country and place, to find duplicates |
| `loose_fingerprint` | The same without the place, because not every board gives a city |
| `other_sources` | Links to the same job on other boards |
| `salary_annual_min_eur`, `salary_annual_max_eur` | One scale for comparing salaries |
| Index `ix_vacancy_search` | Fast search by country, industry and date |

### `app/schemas.py`
API response formats (Pydantic): `CountryOut`, `IndustryOut`, `CostOfLivingYearOut`, `CostOfLivingRankOut`,
`CountryCostOfLivingOut`, `VacancyOut`, `VacancyDetailOut`, `VacancyPageOut`, `HealthOut`. Schemas are separate from
tables so internal fields like `fingerprint` don't reach the response. `ORMModel` is the shared base that lets a schema be built directly from a table row.

### `app/seed.py`
`seed(session)` fills countries, industries and the baseline index. Safe to run many times: existing rows are updated and no duplicates appear.

### `app/cli.py`
Maintenance commands. `main()` parses the arguments and runs the right one.

| Command | Function | Parameters |
|---|---|---|
| `refresh-all` | `refresh_everything()` | none |
| `refresh-vacancies` | `refresh_vacancies(country_codes, max_pages)` | `--country PL GR`, `--max-pages` |
| `refresh-source` | `refresh_one_source(name, max_pages)` | source name, `--max-pages` |
| `refresh-col` | `refresh_col(since)` | `--since 2020` |

`print_save_result(result)` prints the summary.

---

## One vacancy format: `app/integrations/base.py`

Each adapter turns a board's data into a `NormalizedVacancy`, so the rest of the code knows nothing about the boards' quirks.

| Field | Meaning |
|---|---|
| `source`, `external_id` | The source and the id on it |
| `title`, `url`, `country_code` | Required fields |
| `posted_at` | **Required date.** A vacancy without a date doesn't reach the database |
| `company`, `description`, `city`, `remote` | Optional data |
| `location` | The place if there's no city, such as a region code |
| `industry` | Industry `slug` |
| `salary_min`, `salary_max`, `salary_currency`, `salary_period` | The salary as on the board |
| `fingerprint`, `loose_fingerprint` | Filled automatically |
| `match_title` | The title as another board writes it |
| `occupation_uris` | Links to ESCO occupations still to be looked up |

| Function | What it does | Why |
|---|---|---|
| `is_too_old(self, now, max_age_days=30)` | Whether more than 30 days have passed | One freshness rule |
| `fill_computed_fields(vacancy)` | Guesses a missing industry, computes the fingerprints | Without a company the fingerprint includes the id, because a title and place don't identify a job |
| `annual_min_eur(vacancy, rates)`, `annual_max_eur(vacancy, rates)` | Salary in euros per year | One scale |
| `collect_pages(fetch_page, parse, count_raw_jobs, page_size, max_pages, pause_seconds)` | Reads a board page by page | A shared loop for all adapters |

How `collect_pages` behaves: a short page means the end; pauses happen only between pages; a temporary failure is retried once by `_fetch_with_retry(fetch_page, page)`, and `_is_temporary(error)` decides what counts as temporary (a dropped connection or a 5xx, not a 400 past the page limit); an error on the first page is then passed on, and on later pages what was read is kept.

| Constant | Purpose |
|---|---|
| `MAX_VACANCY_AGE_DAYS = 30` | How long a vacancy stays current |
| `JOB_PARSE_ERRORS` | Errors of a broken vacancy: one is skipped, not the whole page |
| `REQUEST_ERRORS` | Request errors and non-JSON answers, like a maintenance page with status 200 |

---

## Adapters: `app/integrations/`

All are built the same way: `parse_*_job` parses one vacancy, `parse_*_response` parses a response and skips broken ones, `fetch_*` downloads.

### `eures.py`: EURES, 27 countries
The EU-wide portal and the main source.

| Function | What it does |
|---|---|
| `eures_location_code(country_code)` | The country code for the request: Greece is `el` in EURES, not `gr` |
| `build_eures_search_body(country_code, page)` | The request body, including the `LAST_MONTH` filter |
| `fetch_eures_page(client, country_code, page)` | One page |
| `fetch_eures_country(client, country_code, max_pages=200, pause_seconds=0.2)` | All of a country's pages |
| `eures_posted_at(job)` | The date from milliseconds, in UTC |
| `eures_industry(job)` | The industry from ISCO codes |
| `eures_occupation_uris(job)` | Links to ESCO occupations |
| `eures_location(job, country_code)` | Region codes, so branches don't count as duplicates |
| `parse_eures_job(job, country_code)`, `parse_eures_response(data, country_code)` | Parsing |

**Why the date is checked again:** the `LAST_MONTH` filter lets old vacancies through if they were modified recently.
`EURES_MAX_PAGES = 200`, because page 201 answers with error 400.

### `bundesagentur.py`: Germany
| Function | What it does |
|---|---|
| `fetch_ba_page(client, page)`, `fetch_ba_jobs(client, max_pages=100, pause_seconds=0.2)` | Download, the `X-API-Key` header is required |
| `ba_address(job)`, `ba_posted_at(job)` | Address and date |
| `ba_title(job)` | Title; training places may lack one, then the occupation is used |
| `ba_industry(job)` | The industry from the title, then the occupation |
| `ba_match_title(job)` | The title as in EURES: `title (occupation)`, to find copies |
| `parse_ba_job(job)`, `parse_ba_response(data)` | Parsing, jobs abroad are skipped |

### `cv.py`: Estonia, Latvia, Lithuania
The three sites share one API, so there's one code and three settings of `CvSite(source, search_url, job_url, country_code, country_id)`: `CV_EE`, `CV_LV`, `CV_LT`.

- `cv_industry(job)` takes the industry from `CV_CATEGORY_TO_INDUSTRY`: the category numbers were found by trying the site's filters.
- `parse_cv_job(job, site)`, `parse_cv_response(data, site)` parse the data; jobs in other countries are skipped.
- `fetch_cv_jobs(client, max_pages=20, pause_seconds=0.2, *, site)` downloads; `fetch_cv_ee`, `fetch_cv_lv`, `fetch_cv_lt` are the same function with `site` already set.

The town arrives only as a number, so it's stored as `location="town:314"`: it can't be shown, but it tells branches apart.

### `justjoin.py`: IT jobs in Poland
- `jj_salary(job)` takes the salary in the employer's currency, because the board adds its own conversions.
- `parse_jj_job(job)`, `parse_jj_response(data)` parse the data.
- `fetch_jj_jobs(client, max_pages=100, pause_seconds=0.2)` downloads.

**Important:** the amount comes from `fromPerUnit`, not `from`. `from` is already scaled to a month, so 17 USD an hour would look like 2856 an hour, or millions a year.

### `jobtech.py`: Sweden
- `parse_jt_job(job)`, `parse_jt_response(data)` parse the data; removed and foreign jobs are skipped.
- `fetch_jt_jobs(client, max_pages=21, pause_seconds=0.2)` downloads the newest from the last 30 days.
- `JT_FIELD_TO_INDUSTRY` maps the site's occupation fields to our industries.

### `esco.py`: occupation codes
Most EURES vacancies have a link to an ESCO occupation instead of an ISCO code. Its code starts with ISCO: `3313.2` → `3313`.

| Function | What it does |
|---|---|
| `fetch_isco_code(client, uri)` | Asks for one occupation's code |
| `resolve_isco_codes(session, client, uris, pause_seconds=0.2)` | Asks only for what's not in the cache |
| `apply_occupation_industries(session, client, vacancies, pause_seconds=0.2)` | Replaces a guessed industry with a more exact one |

A request takes over a second, so answers are stored for 365 days. A failing link is skipped, because some links always answer 500. After `ESCO_MAX_FAILURES_IN_A_ROW = 3` failures in a row lookups stop, and vacancies keep the industry from the title.

### `ecb.py`: exchange rates
- `parse_ecb_rates(xml_text)` parses the bank's XML.
- `get_exchange_rates(session, client)` takes rates from a one-day cache; on failure it returns an empty dict and a warning. Salaries in euros are still converted.

---

## Rules: `app/services/`

### `salary.py`
- `to_annual(amount, period)` converts to a yearly amount using `PERIODS_PER_YEAR` (`year`, `month`, `week`, `day`, `hour`).
- `to_eur(amount, currency, rates)` converts to euros.

Both return `None` when data is missing instead of raising an error: salaries are often absent, and that's normal.

### `normalize.py`
- `normalize_title(title)`: lowercase, no markers like `(m/w/d)`.
- `normalize_company(company)`: no legal forms like `GmbH`, `sp. z o.o.`.
- `fingerprint(title, company, country_code, city)`: sha1 of the normalized values.

So identical vacancies with different spelling get the same fingerprint.

### `classify.py`
- `matches_keyword(title, keyword)` supports four kinds of keywords:

| Kind | Example | Meaning |
|---|---|---|
| Word | `python` | A whole word |
| Phrase | `data scientist` | Whole words in a row |
| Start | `entwickl*` | A word starts like this |
| Part | `*buchhalt*` | Anywhere, for German compound words |

- `classify_industry(title)` returns the first matching industry or `other`.
- `industry_from_isco(code)` uses the most exact prefix: `52` is retail, and `5244` is a call centre.

### `vacancies.py`: saving
`save_vacancies(session, vacancies, rates)` decides what happens to each vacancy:

| Situation | Action | Counter |
|---|---|---|
| The same `source`, id and country already exist | Update the row | `updated` |
| A new record with no matches | Insert | `inserted` |
| Same fingerprint as a row older than 30 days, and the vacancy is fresh | The row becomes the new posting | `updated` |
| Same fingerprint, same board, both texts present and different | Another job: a new row whose fingerprint includes the text | `inserted` |
| Same fingerprint, same board, same text or a text is missing | Skip | `skipped` |
| Same fingerprint, another board | Add a link | `merged` |
| Another board, no city to compare, dates within 3 days, no copy from that board yet | Add a link | `merged` |

Helper functions:

| Function | What it does |
|---|---|
| `_load_industry_ids(session)` | A dict of `slug` → industry id |
| `_load_existing_rows(session, vacancies)` | One query instead of one per vacancy |
| `_row_key(source, external_id, country_code)` | A row's identity |
| `_copy_fields(row, vacancy, industry_id, rates)` | Copies fields, cuts text to column sizes, computes the salary |
| `_plausible_salary(annual_eur)` | Hides yearly salaries outside 1,000–1,000,000 euros |
| `_as_utc(moment)` | Aligns the time zone between databases |
| `_published_close_together(row, vacancy)` | Dates within `COPY_MAX_DAYS_APART = 3` |
| `_is_repost_of_expired_row(row, vacancy, now)` | Whether this is a new posting of an expired vacancy |
| `_find_twin_without_city(rows, vacancy)` | A copy on another board without a city; a row takes only one copy from each board |
| `_add_other_source(twin, vacancy)` | Adds a link without repeats |

Refresh functions:

| Function | What it does |
|---|---|
| `save_in_batches(session, vacancies, rates)` | Saves in parts of `SAVE_BATCH_SIZE = 1000`, because one query can't take tens of thousands of values |
| `refresh_eures(session, client, country_codes=None, max_pages=200, pause_seconds=0.2)` | EURES by country; a failed country goes into `failed`, the rest continue |
| `refresh_source(session, client, name, max_pages=None, rates=None)` | One source from the `SOURCES` dict |
| `refresh_all(session, client)` | All sources: national boards before EURES, because they give the city |

`SaveResult` counts `inserted`, `updated`, `merged`, `skipped`, `failed`; the `add(other)` method adds results together.

### `cache.py`
- `cache_key(text)`: sha256, so any text fits the 64-character column.
- `cache_get_many(session, keys)`: saved values that haven't expired.
- `cache_set(session, key, payload, ttl_days)`: saves right away, so an interrupted run keeps what it learned.

### `cost_of_living.py`
```
index = (net earnings in the country / EU average) / (price level / 100) × 100
```

| Function | What it does |
|---|---|
| `purchasing_power_index(net_earnings, price_level, eu_net_earnings)` | The formula |
| `parse_jsonstat(payload)` | Parses the Eurostat format |
| `_fetch_dataset(client, query, geos, since_year)` | Downloads one dataset |
| `refresh_from_eurostat(session, client, since_year=2020)` | Refreshes the index, saving only years with complete data |
| `load_baseline(session)` | Initial data, so a new database has an index right away |

`RefreshResult` holds a refresh's result: `saved`, `years`, `countries_without_data`.

---

## API: `app/api/routes/`

| File | Function | Endpoint |
|---|---|---|
| `health.py` | `health(session)` | `GET /health` |
| `countries.py` | `list_countries(session)` | `GET /countries` |
| `countries.py` | `get_country(code, session)` | `GET /countries/{code}` |
| `industries.py` | `list_industries(session)` | `GET /industries` |
| `cost_of_living.py` | `ranking(session)` | `GET /cost-of-living` |
| `cost_of_living.py` | `country_index(code, session)` | `GET /cost-of-living/{code}` |
| `vacancies.py` | `list_vacancies(country, industry, q, page, page_size, session)` | `GET /vacancies` |
| `vacancies.py` | `get_vacancy(vacancy_id, session)` | `GET /vacancies/{id}` |

Search parameters of `list_vacancies`:

| Parameter | Value | Description |
|---|---|---|
| `country` | list, optional | Without it, searches all countries |
| `industry` | `slug`, optional | Industry |
| `q` | string, optional | Title or company; `%` and `_` are plain text |
| `page` | from 1 | Page |
| `page_size` | 1–100, 20 by default | Page size |

Helper functions:
- `_search_filters(countries, now, industry=None, keyword=None)` builds the search conditions, including the 30-day rule.
- `_load_countries(session, rows, now)` collects all of a vacancy's countries.

**Why grouping:** a vacancy from several countries is stored as several rows but shown once. The query groups rows by `source` + `external_id`, so `total` and the pages count vacancies, not rows.

---

## Reference data: `app/data/`

| File | Contents |
|---|---|
| `countries.py` | `CountryDef`, `COUNTRIES`, `COUNTRY_BY_CODE`: the 27 EU countries |
| `industries.py` | `IndustryDef`, `INDUSTRIES`, `INDUSTRY_BY_SLUG`: 19 industries with keywords; `ISCO_TO_INDUSTRY`: ISCO codes → industry |
| `cost_of_living.py` | `BASELINE`, `BASELINE_YEAR`, `EU_NET_EARNINGS_EUR`: the baseline index |

## Migrations: `alembic/versions/`

| Migration | What it does |
|---|---|
| `0001_initial_schema` | All tables |
| `0002_vacancy_unique_per_country` | A separate vacancy row for each country |
| `0003_vacancy_loose_fingerprint` | The fingerprint without the city |

## Tests: `tests/`

Tests use fake board responses through `respx`, so they need no internet, and the sample data comes from real responses. Locally they run on SQLite, in CI on PostgreSQL. CI also applies the migrations and checks that they match the models.

## How to add a new source

1. Create `app/integrations/name.py` with `parse_*_job`, `parse_*_response`, `fetch_*`.
2. Use `collect_pages` for the download.
3. Add the function to `SOURCES` in `app/services/vacancies.py`.
4. Write tests on a real response from the site.
5. Check dates, salaries, the page limit and vacancy links on real data.
