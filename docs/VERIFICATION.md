# Verification report

**English** | [Русский](VERIFICATION.ru.md)

A full refresh of every source on real data, run on 2026-11-04 on commit `993dd92`, followed by a partial rerun
of the fixes it led to.

## How it was tested

| Check | How |
|---|---|
| Automated tests | 387 tests with fake responses based on real ones; in CI on PostgreSQL |
| Migrations | Applied, compared with the models and rolled back in CI on PostgreSQL |
| Full refresh | All sources and 27 countries, on a temporary **SQLite** database |
| Search speed | Requests to the real API code on the resulting database |

## Full refresh results

| Measure | Result |
|---|---|
| Duration | 137 minutes |
| Crashes | 0 |
| Countries or sources that failed | 0 |
| Rows in the database | 119,476 |
| Countries with vacancies | 27 of 27 |
| New / updated / linked as copies / skipped | 119,476 / 937 / 2,523 / 10,293 |
| Vacancies with a salary in euros | 7,517 |
| Database size | 313 MB |

Rows by source:

| Source | Rows |
|---|---|
| EURES | 99,809 |
| justjoin.it | 9,226 |
| Bundesagentur | 4,000 (stopped early, see below; 9,638 after the fix) |
| JobTech | 2,057 |
| cv.lv | 2,003 |
| cv.ee | 1,217 |
| cvonline.lt | 1,164 |

Share of vacancies in the `other` industry:

| Source | `other` |
|---|---|
| EURES | 20% |
| Bundesagentur | 25% |
| JobTech | 23% |
| cv.ee, cv.lv | 1% |
| cvonline.lt | 0% |
| justjoin.it | 1% |

## Search speed

Fastest of 3 requests, on SQLite with about 119,000 rows, on a laptop. A deployed PostgreSQL will differ.

| Request | Found | Time |
|---|---|---|
| All vacancies | 119,054 | 271 ms |
| `?country=DE` | 13,392 | 97 ms |
| `?country=PL&country=GR` | 15,935 | 96 ms |
| `?industry=it` | 12,185 | 233 ms |
| `?q=python` | 407 | 275 ms |
| `?q=manager&country=DE` | 472 | 93 ms |
| `?page=500` | 119,054 | 283 ms |
| `/vacancies/{id}` | 1 | 67 ms |

Walking the first 500 results across pages gave no repeated links.

## Bugs found and fixed

| Bug | Evidence | Fix | Result of the rerun |
|---|---|---|---|
| **One failing ESCO link stopped all the links after it**, on every run | The same 3 links always answer 500; lookups stopped in 16 of 27 countries | A failing link is skipped; lookups stop after 3 failures in a row | No more stops: 119 more occupations resolved in part of one country |
| **Branches of a chain hid behind one card** | One row had 132 links, 33 rows hid 361 vacancies | A record takes only one copy from each board | At most 1 link per row |
| **Impossible salaries** | Up to 9.4 million euros a year, as low as 12 euros a year | Yearly amounts outside 1,000–1,000,000 euros aren't shown | Range 1,600–239,200 euros |
| **A dropped connection cost a board most of its pages** | Bundesagentur stopped at page 42 of 100 | A temporary failure is retried once | 9,638 vacancies instead of 4,000, all 100 pages |

**The fixes were rerun only in part:** Bundesagentur, 40 pages of EURES for Germany, and justjoin.it. The full
refresh wasn't repeated, so the full results above come from before the fixes.

## Skipped vacancies check

Many skipped vacancies were real jobs. A sample of live EURES data, downloaded on 2026-11-04 (Italy 200 pages,
Poland 100 pages), was saved through the old and the new code. Only vacancies under 30 days old were saved, as in a
real refresh, into a temporary SQLite database.

| Country | Fresh vacancies | Skipped, old code | Skipped, new code | Rows, old code | Rows, new code |
|---|---|---|---|---|---|
| Italy | 4,338 | 2,331 | 411 | 2,007 | 3,927 |
| Poland | 3,518 | 75 | 27 | 3,437 | 3,485 |

- **Cause:** one staffing agency, GI GROUP, gave about 90% of the skips in the Italian sample, posting many jobs under one
  occupation name in one region. In Poland, separate county labour offices share the name "Powiatowy Urząd Pracy".
- **Fix:** on the same board, a vacancy is a duplicate only if its description also matches, ignoring spaces and line
  breaks. A missing description proves nothing, so that vacancy is still skipped.
- **Repeat runs:** two more runs on the same data added no rows.
- **Limits:** it's two countries, and Italy was chosen as the worst case. Six pairs were read by hand, and they weren't a
  random sample. The full refresh wasn't repeated, so the 10,293 above is from the old code.

## Known open questions

| Question | Why it matters | Status |
|---|---|---|
| **Are the remaining skipped vacancies real duplicates?** | Skipped vacancies aren't shown, so real jobs could be lost | Partly checked, see above. Bundesagentur and justjoin.it search results have no description, so their skips can't be checked this way |
| **Do nearly identical texts show as separate cards?** | The same job reposted with a small edit now appears twice | Yes, by choice: an extra card is better than a lost job. Not counted across all countries |
| **Are linked copies real copies?** | A false link hides a job | Titles and companies match by construction, and dates are within 3 days. A chain branch published the same day can still be linked. No sample was compared by hand |
| **Is the 3-day limit right?** | Too strict leaves duplicates, too loose hides jobs | An estimate |
| **Is the job coverage enough?** | Page limits mean large countries are read only in part: German EURES rows were almost all from the last 3 days | Daily runs should accumulate them, but that hasn't been tested |
| **Does the full refresh work on PostgreSQL?** | SQLite allows things PostgreSQL rejects | Only tests and migrations ran on PostgreSQL |
| **How long will later refreshes take?** | The first run included many ESCO lookups | Not measured |
| **Does `docker compose up` work?** | It's the quick start in the README | Not run: no Docker on the machine used |

## Rerunning the check

```bash
cd backend
export DATABASE_URL=sqlite+aiosqlite:///full.db
alembic upgrade head
python -m app.seed
python -m app.cli refresh-all
```
