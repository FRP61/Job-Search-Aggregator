from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import delete, select

from app.integrations.base import NormalizedVacancy, fill_computed_fields
from app.models import Vacancy
from app.services.vacancies import save_vacancies

URL = "/api/v1/vacancies"


def days_ago(days: int) -> datetime:
    return datetime.now(UTC) - timedelta(days=days)


def make_vacancy(external_id: str, country_code: str = "DE", posted_at: datetime | None = None, **fields):
    vacancy = NormalizedVacancy(
        source="eures",
        external_id=external_id,
        title=f"Python Developer {external_id}",
        url=f"https://eures.example/{external_id}",
        country_code=country_code,
        posted_at=posted_at or days_ago(1),
        **fields,
    )
    return fill_computed_fields(vacancy)


@pytest.fixture(autouse=True)
async def empty_vacancies(session):
    await session.execute(delete(Vacancy))
    await session.commit()


async def found_ids(client, **params) -> list[str]:
    response = await client.get(URL, params=params)
    assert response.status_code == 200
    return [item["url"].rsplit("/", 1)[1] for item in response.json()["items"]]


async def test_without_a_country_shows_all_countries(session, client):
    await save_vacancies(session, [make_vacancy("de", "DE"), make_vacancy("pl", "PL")], {})

    assert sorted(await found_ids(client)) == ["de", "pl"]


async def test_filters_by_one_country(session, client):
    await save_vacancies(session, [make_vacancy("de", "DE"), make_vacancy("pl", "PL")], {})

    assert await found_ids(client, country="PL") == ["pl"]


async def test_filters_by_several_countries(session, client):
    vacancies = [make_vacancy("de", "DE"), make_vacancy("pl", "PL"), make_vacancy("gr", "GR")]
    await save_vacancies(session, vacancies, {})

    assert sorted(await found_ids(client, country=["PL", "GR"])) == ["gr", "pl"]


async def test_country_code_in_lowercase_works(session, client):
    await save_vacancies(session, [make_vacancy("pl", "PL")], {})

    assert await found_ids(client, country="pl") == ["pl"]


async def test_unknown_country_finds_nothing(session, client):
    await save_vacancies(session, [make_vacancy("pl", "PL")], {})

    assert await found_ids(client, country="XX") == []


async def test_vacancies_older_than_30_days_are_hidden(session, client):
    vacancies = [make_vacancy("fresh", posted_at=days_ago(29)), make_vacancy("old", posted_at=days_ago(31))]
    await save_vacancies(session, vacancies, {})

    response = await client.get(URL)
    assert [item["url"].rsplit("/", 1)[1] for item in response.json()["items"]] == ["fresh"]
    assert response.json()["total"] == 1


async def test_newest_comes_first(session, client):
    vacancies = [
        make_vacancy("middle", posted_at=days_ago(5)),
        make_vacancy("oldest", posted_at=days_ago(9)),
        make_vacancy("newest", posted_at=days_ago(1)),
    ]
    await save_vacancies(session, vacancies, {})

    assert await found_ids(client) == ["newest", "middle", "oldest"]


async def test_pages_do_not_overlap_and_total_counts_everything(session, client):
    await save_vacancies(session, [make_vacancy(f"job{i}", posted_at=days_ago(i + 1)) for i in range(5)], {})

    first = (await client.get(URL, params={"page": 1, "page_size": 2})).json()
    third = (await client.get(URL, params={"page": 3, "page_size": 2})).json()

    assert first["total"] == 5
    assert (first["page"], first["page_size"]) == (1, 2)
    assert [item["url"].rsplit("/", 1)[1] for item in first["items"]] == ["job0", "job1"]
    assert [item["url"].rsplit("/", 1)[1] for item in third["items"]] == ["job4"]


async def test_total_respects_the_country_filter(session, client):
    await save_vacancies(session, [make_vacancy("de", "DE"), make_vacancy("pl", "PL")], {})

    assert (await client.get(URL, params={"country": "PL"})).json()["total"] == 1


@pytest.mark.parametrize("params", [{"page": 0}, {"page_size": 0}, {"page_size": 101}])
async def test_invalid_paging_is_rejected(client, params):
    assert (await client.get(URL, params=params)).status_code == 422


async def test_item_has_the_fields_the_frontend_needs(session, client):
    vacancy = make_vacancy("1", "PL", salary_min=4250, salary_currency="PLN", salary_period="month", company="Bosch")
    await save_vacancies(session, [vacancy], {"PLN": 4.25})

    item = (await client.get(URL)).json()["items"][0]
    assert item["title"] == "Python Developer 1"
    assert item["company"] == "Bosch"
    assert item["countries"] == ["PL"]
    assert item["industry"]["slug"] == "it"
    assert item["salary_annual_min_eur"] == 12000
    assert item["salary_annual_max_eur"] is None
    assert item["other_sources"] == []
    assert item["posted_at"] is not None
    assert "description" not in item


async def test_job_in_several_countries_comes_once_with_all_of_them(session, client):
    vacancies = [make_vacancy("multi", code) for code in ("IT", "AT", "ES")] + [make_vacancy("single", "PL")]
    await save_vacancies(session, vacancies, {})

    data = (await client.get(URL)).json()

    assert data["total"] == 2
    assert {item["url"].rsplit("/", 1)[1]: item["countries"] for item in data["items"]} == {
        "multi": ["AT", "ES", "IT"],
        "single": ["PL"],
    }


async def test_choosing_several_of_its_countries_still_shows_the_job_once(session, client):
    await save_vacancies(session, [make_vacancy("multi", code) for code in ("IT", "AT", "ES")], {})

    data = (await client.get(URL, params={"country": ["AT", "IT"]})).json()

    assert data["total"] == 1
    assert data["items"][0]["countries"] == ["AT", "ES", "IT"]


async def test_choosing_one_country_lists_the_others_too(session, client):
    await save_vacancies(session, [make_vacancy("multi", code) for code in ("IT", "AT")], {})

    data = (await client.get(URL, params={"country": "AT"})).json()

    assert data["items"][0]["countries"] == ["AT", "IT"]


async def test_country_where_the_job_is_too_old_is_not_listed(session, client):
    vacancies = [make_vacancy("multi", "AT"), make_vacancy("multi", "IT", posted_at=days_ago(31))]
    await save_vacancies(session, vacancies, {})

    assert (await client.get(URL)).json()["items"][0]["countries"] == ["AT"]


async def test_paging_counts_jobs_not_rows(session, client):
    vacancies = []
    for i in range(3):
        vacancies += [make_vacancy(f"job{i}", code, posted_at=days_ago(i + 1)) for code in ("AT", "IT")]
    await save_vacancies(session, vacancies, {})

    first = (await client.get(URL, params={"page": 1, "page_size": 2})).json()
    second = (await client.get(URL, params={"page": 2, "page_size": 2})).json()

    assert first["total"] == 3
    assert [item["url"].rsplit("/", 1)[1] for item in first["items"]] == ["job0", "job1"]
    assert [item["url"].rsplit("/", 1)[1] for item in second["items"]] == ["job2"]


async def test_same_id_from_different_boards_stays_separate(session, client):
    other_board = NormalizedVacancy(
        source="adzuna",
        external_id="1",
        title="Cook",
        url="https://adzuna.example/1",
        country_code="DE",
        posted_at=days_ago(1),
    )
    await save_vacancies(session, [make_vacancy("1", "DE"), fill_computed_fields(other_board)], {})

    assert (await client.get(URL)).json()["total"] == 2


async def test_page_past_the_end_is_empty(session, client):
    await save_vacancies(session, [make_vacancy("1")], {})

    data = (await client.get(URL, params={"page": 5})).json()

    assert data["total"] == 1
    assert data["items"] == []


async def first_id(client) -> int:
    return (await client.get(URL)).json()["items"][0]["id"]


async def test_detail_has_the_full_description(session, client):
    await save_vacancies(session, [make_vacancy("1", description="Long text about the job")], {})

    response = await client.get(f"{URL}/{await first_id(client)}")

    assert response.status_code == 200
    assert response.json()["description"] == "Long text about the job"
    assert response.json()["title"] == "Python Developer 1"


async def test_detail_lists_all_countries_of_the_job(session, client):
    await save_vacancies(session, [make_vacancy("multi", code) for code in ("IT", "AT")], {})

    response = await client.get(f"{URL}/{await first_id(client)}")

    assert response.json()["countries"] == ["AT", "IT"]


async def test_detail_of_a_missing_vacancy_is_404(client):
    assert (await client.get(f"{URL}/999999")).status_code == 404


async def test_detail_of_a_too_old_vacancy_is_404(session, client):
    await save_vacancies(session, [make_vacancy("old", posted_at=days_ago(31))], {})
    row = await session.scalar(select(Vacancy))

    assert (await client.get(f"{URL}/{row.id}")).status_code == 404


async def test_detail_id_must_be_a_number(client):
    assert (await client.get(f"{URL}/abc")).status_code == 422
