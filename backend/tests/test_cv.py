from datetime import UTC, datetime

import httpx
import pytest
import respx

from app.integrations.cv import CV_EE, CV_LT, CV_LV, CV_PAGE_SIZE, fetch_cv_jobs, parse_cv_job, parse_cv_response

# A job as the board really returns it (shortened)
REAL_JOB = {
    "id": 1677383,
    "positionTitle": "Jurist/assistent",
    "positionContent": "Bakalaurusekraad või selle omandamine õigusteaduses",
    "employerName": "Kohtutäitur Anne Böckler",
    "publishDate": "2026-11-04T17:31:03.078+00:00",
    "townId": 314,
    "countryId": 1,
    "salaryFrom": None,
    "salaryTo": None,
    "hourlySalary": False,
    "remoteWork": False,
    "remoteWorkType": "ON_SITE",
}


def test_real_job_is_parsed():
    vacancy = parse_cv_job(REAL_JOB, CV_EE)
    assert vacancy.source == "cv_ee"
    assert vacancy.external_id == "1677383"
    assert vacancy.title == "Jurist/assistent"
    assert vacancy.company == "Kohtutäitur Anne Böckler"
    assert vacancy.country_code == "EE"
    assert vacancy.url == "https://www.cv.ee/et/vacancy/1677383"
    assert vacancy.posted_at == datetime(2026, 11, 4, 17, 31, 3, 78000, tzinfo=UTC)
    assert vacancy.location == "town:314"
    assert vacancy.remote is False
    assert vacancy.salary_currency is None


def test_salary_is_monthly_in_euros():
    vacancy = parse_cv_job({**REAL_JOB, "salaryFrom": 1300.0, "salaryTo": 1900.0}, CV_EE)
    assert (vacancy.salary_min, vacancy.salary_max) == (1300.0, 1900.0)
    assert (vacancy.salary_currency, vacancy.salary_period) == ("EUR", "month")


def test_hourly_salary_and_lower_bound_only():
    vacancy = parse_cv_job({**REAL_JOB, "salaryFrom": 8.0, "hourlySalary": True}, CV_EE)
    assert vacancy.salary_period == "hour"
    assert vacancy.salary_max is None


def test_fully_remote():
    assert parse_cv_job({**REAL_JOB, "remoteWorkType": "FULLY_REMOTE"}, CV_EE).remote is True


def test_hybrid_is_not_remote():
    assert parse_cv_job({**REAL_JOB, "remoteWorkType": "HYBRID"}, CV_EE).remote is False


@pytest.mark.parametrize(
    ("site", "country", "url"),
    [
        (CV_LV, "LV", "https://www.cv.lv/lv/vacancy/1677383"),
        (CV_LT, "LT", "https://www.cvonline.lt/lt/vacancy/1677383"),
    ],
)
def test_each_site_has_its_country_and_link(site, country, url):
    vacancy = parse_cv_job(REAL_JOB, site)
    assert (vacancy.country_code, vacancy.url) == (country, url)


def test_job_in_another_country_is_skipped():
    data = {"vacancies": [REAL_JOB, {**REAL_JOB, "id": 2, "countryId": 157}]}
    assert [v.external_id for v in parse_cv_response(data, CV_EE)] == ["1677383"]


@pytest.mark.parametrize("field", ["id", "positionTitle", "publishDate", "countryId"])
def test_broken_job_is_skipped(field):
    broken = {key: value for key, value in REAL_JOB.items() if key != field}
    assert len(parse_cv_response({"vacancies": [broken, REAL_JOB]}, CV_EE)) == 1


def test_bad_date_is_skipped():
    assert parse_cv_response({"vacancies": [{**REAL_JOB, "publishDate": "soon"}]}, CV_EE) == []


def fresh_job(job_id: int) -> dict:
    return {**REAL_JOB, "id": job_id, "publishDate": datetime.now(UTC).isoformat()}


@respx.mock
async def test_second_page_starts_after_the_first(monkeypatch):
    async def fake_sleep(seconds):
        pass

    monkeypatch.setattr("app.integrations.base.asyncio.sleep", fake_sleep)
    route = respx.get(CV_EE.search_url).mock(
        side_effect=[
            httpx.Response(200, json={"vacancies": [fresh_job(i) for i in range(CV_PAGE_SIZE)]}),
            httpx.Response(200, json={"vacancies": [fresh_job(9999)]}),
        ]
    )

    async with httpx.AsyncClient() as client:
        vacancies = await fetch_cv_jobs(client, site=CV_EE)

    assert len(vacancies) == CV_PAGE_SIZE + 1
    assert route.calls[1].request.url.params["offset"] == str(CV_PAGE_SIZE)


def test_industry_comes_from_the_category():
    assert parse_cv_job({**REAL_JOB, "categories": [12]}, CV_EE).industry == "legal"


def test_first_known_category_wins():
    assert parse_cv_job({**REAL_JOB, "categories": [33, 10, 7]}, CV_EE).industry == "it"


def test_unknown_category_falls_back_to_the_title():
    job = {**REAL_JOB, "positionTitle": "Python Developer", "categories": [33]}
    assert parse_cv_job(job, CV_EE).industry == "it"
