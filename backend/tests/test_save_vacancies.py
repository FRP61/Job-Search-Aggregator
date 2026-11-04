from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import delete, select

from app.integrations.base import NormalizedVacancy, fill_computed_fields
from app.integrations.bundesagentur import parse_ba_job
from app.models import Industry, Vacancy
from app.services.vacancies import save_in_batches, save_vacancies


def make_vacancy(
    external_id: str = "1", source: str = "eures", title: str = "Python Developer", country_code: str = "DE", **fields
):
    fields.setdefault("posted_at", datetime(2026, 11, 2, tzinfo=UTC))
    vacancy = NormalizedVacancy(
        source=source,
        external_id=external_id,
        title=title,
        url=f"https://{source}.example/{external_id}",
        country_code=country_code,
        company="Volvo",
        **fields,
    )
    return fill_computed_fields(vacancy)


@pytest.fixture(autouse=True)
async def empty_vacancies(session):
    await session.execute(delete(Vacancy))
    await session.commit()


async def saved_rows(session) -> list[Vacancy]:
    session.expire_all()
    return list(await session.scalars(select(Vacancy).order_by(Vacancy.id)))


async def test_new_vacancy_is_inserted(session):
    result = await save_vacancies(session, [make_vacancy()], {})

    rows = await saved_rows(session)
    assert result.inserted == 1
    assert [(row.source, row.external_id, row.title) for row in rows] == [("eures", "1", "Python Developer")]


async def test_industry_slug_becomes_the_id_of_that_industry(session):
    await save_vacancies(session, [make_vacancy()], {})

    row = (await saved_rows(session))[0]
    industry = await session.scalar(select(Industry).where(Industry.slug == "it"))
    assert row.industry_id == industry.id


async def test_unknown_industry_is_saved_without_one(session):
    vacancy = make_vacancy(industry="no-such-industry")
    await save_vacancies(session, [vacancy], {})

    assert (await saved_rows(session))[0].industry_id is None


async def test_salary_is_converted_to_euros_per_year(session):
    vacancy = make_vacancy(salary_min=4250, salary_max=8500, salary_currency="PLN", salary_period="month")
    await save_vacancies(session, [vacancy], {"PLN": 4.25})

    row = (await saved_rows(session))[0]
    assert row.salary_annual_min_eur == 12000
    assert row.salary_annual_max_eur == 24000


async def test_posted_at_is_saved(session):
    posted_at = datetime(2026, 11, 2, 12, 26, tzinfo=UTC)
    await save_vacancies(session, [make_vacancy(posted_at=posted_at)], {})

    saved = (await saved_rows(session))[0].posted_at
    assert saved.replace(tzinfo=UTC) == posted_at


async def test_long_text_is_cut_to_the_column_size(session):
    vacancy = make_vacancy(title="T" * 600)
    vacancy.company = "C" * 300
    await save_vacancies(session, [vacancy], {})

    row = (await saved_rows(session))[0]
    assert len(row.title) == 500
    assert len(row.company) == 255


async def test_same_id_again_updates_the_row(session):
    await save_vacancies(session, [make_vacancy(salary_min=1000)], {})
    result = await save_vacancies(session, [make_vacancy(salary_min=2000)], {})

    rows = await saved_rows(session)
    assert result.updated == 1
    assert len(rows) == 1
    assert rows[0].salary_min == 2000


async def test_changed_title_updates_the_fingerprint(session):
    await save_vacancies(session, [make_vacancy(title="Python Developer")], {})
    changed = make_vacancy(title="Senior Python Developer")
    await save_vacancies(session, [changed], {})

    rows = await saved_rows(session)
    assert len(rows) == 1
    assert rows[0].fingerprint == changed.fingerprint


async def test_title_change_that_collides_with_another_row_keeps_the_old_fingerprint(session):
    first = make_vacancy("1", title="Python Developer")
    second = make_vacancy("2", title="Java Developer")
    await save_vacancies(session, [first, second], {})

    second_renamed = make_vacancy("2", title="Python Developer")
    result = await save_vacancies(session, [second_renamed], {})

    rows = await saved_rows(session)
    assert result.updated == 1
    assert rows[1].fingerprint == second.fingerprint
    assert rows[1].title == "Python Developer"


async def test_same_job_on_another_board_becomes_a_link(session):
    await save_vacancies(session, [make_vacancy("1", source="eures")], {})
    result = await save_vacancies(session, [make_vacancy("x", source="adzuna")], {})

    rows = await saved_rows(session)
    assert result.merged == 1
    assert len(rows) == 1
    assert rows[0].other_sources == [{"source": "adzuna", "url": "https://adzuna.example/x"}]


async def test_link_is_not_added_twice(session):
    await save_vacancies(session, [make_vacancy("1", source="eures")], {})
    await save_vacancies(session, [make_vacancy("x", source="adzuna")], {})
    result = await save_vacancies(session, [make_vacancy("x", source="adzuna")], {})

    rows = await saved_rows(session)
    assert result.skipped == 1
    assert len(rows[0].other_sources) == 1


async def test_same_job_twice_on_one_board_is_skipped(session):
    result = await save_vacancies(session, [make_vacancy("1"), make_vacancy("2")], {})

    assert result.inserted == 1
    assert result.skipped == 1
    assert len(await saved_rows(session)) == 1


async def test_same_job_from_two_boards_in_one_batch(session):
    result = await save_vacancies(
        session, [make_vacancy("1", source="eures"), make_vacancy("x", source="adzuna")], {}
    )

    rows = await saved_rows(session)
    assert result.inserted == 1
    assert result.merged == 1
    assert rows[0].other_sources == [{"source": "adzuna", "url": "https://adzuna.example/x"}]


async def test_same_id_twice_in_one_batch_gives_one_row(session):
    result = await save_vacancies(session, [make_vacancy("1"), make_vacancy("1")], {})

    assert result.inserted == 1
    assert result.updated == 1
    assert len(await saved_rows(session)) == 1


async def test_empty_batch_saves_nothing(session):
    result = await save_vacancies(session, [], {})

    assert result.inserted == 0
    assert await saved_rows(session) == []


async def test_new_job_can_take_a_fingerprint_freed_in_the_same_batch(session):
    await save_vacancies(session, [make_vacancy("1", title="Python Developer")], {})

    renamed = make_vacancy("1", title="Java Developer")
    new_job = make_vacancy("2", title="Python Developer")
    result = await save_vacancies(session, [renamed, new_job], {})

    assert result.updated == 1
    assert result.inserted == 1
    assert len(await saved_rows(session)) == 2


async def test_one_job_in_several_countries_gets_a_row_for_each(session):
    await save_vacancies(session, [make_vacancy("1", country_code="AT")], {})
    result = await save_vacancies(session, [make_vacancy("1", country_code="IT")], {})

    rows = await saved_rows(session)
    assert result.inserted == 1
    assert result.updated == 0
    assert [row.country_code for row in rows] == ["AT", "IT"]


async def test_second_run_updates_each_country_separately(session):
    await save_vacancies(session, [make_vacancy("1", country_code="AT", salary_min=1000)], {})
    await save_vacancies(session, [make_vacancy("1", country_code="IT", salary_min=1000)], {})

    result = await save_vacancies(session, [make_vacancy("1", country_code="IT", salary_min=2000)], {})

    rows = await saved_rows(session)
    assert result.updated == 1
    assert [(row.country_code, row.salary_min) for row in rows] == [("AT", 1000), ("IT", 2000)]


def eures_job(
    external_id: str,
    title: str,
    company: str | None = "Pneuhage Management GmbH & Co. KG",
    posted_at: datetime = datetime(2026, 11, 2, tzinfo=UTC),
):
    vacancy = NormalizedVacancy(
        source="eures",
        external_id=external_id,
        title=title,
        url=f"https://eures.example/{external_id}",
        country_code="DE",
        company=company,
        posted_at=posted_at,
    )
    return fill_computed_fields(vacancy)


def ba_job(external_id: str = "ba", city: str | None = "Bruchsal", company: str | None = "Pneuhage Management GmbH & Co. KG"):
    job = {
        "referenznummer": external_id,
        "stellenangebotsTitel": "Innendienstverkäufer (m/w/d)",
        "hauptberuf": "Kaufmann/-frau - Groß- und Außenhandel (Großhandel)",
        "datumErsteVeroeffentlichung": "2026-11-02",
        "firma": company,
    }
    if city:
        job["stellenlokationen"] = [{"adresse": {"ort": city, "land": "DEUTSCHLAND"}}]
    return parse_ba_job(job)


REAL_EURES_TITLE = "Innendienstverkäufer (m/w/d) (Kaufmann/-frau - Groß- und Außenhandel (Großhandel))"


async def test_eures_copy_of_a_bundesagentur_job_becomes_a_link(session):
    await save_vacancies(session, [ba_job()], {})
    result = await save_vacancies(session, [eures_job("e1", REAL_EURES_TITLE)], {})

    rows = await saved_rows(session)
    assert result.merged == 1
    assert len(rows) == 1
    assert rows[0].city == "Bruchsal"
    assert rows[0].other_sources == [{"source": "eures", "url": "https://eures.example/e1"}]


async def test_bundesagentur_copy_of_an_eures_job_becomes_a_link(session):
    await save_vacancies(session, [eures_job("e1", REAL_EURES_TITLE)], {})
    result = await save_vacancies(session, [ba_job()], {})

    assert result.merged == 1
    assert len(await saved_rows(session)) == 1


async def test_copy_in_the_same_batch_becomes_a_link(session):
    result = await save_vacancies(session, [ba_job(), eures_job("e1", REAL_EURES_TITLE)], {})

    assert result.inserted == 1
    assert result.merged == 1


async def test_second_refresh_does_not_add_the_link_again(session):
    await save_vacancies(session, [ba_job(), eures_job("e1", REAL_EURES_TITLE)], {})
    result = await save_vacancies(session, [eures_job("e1", REAL_EURES_TITLE)], {})

    rows = await saved_rows(session)
    assert result.skipped == 1
    assert len(rows[0].other_sources) == 1


async def test_same_job_in_two_cities_on_one_board_stays_separate(session):
    result = await save_vacancies(session, [ba_job("a", "Bruchsal"), ba_job("b", "Köln")], {})

    assert result.inserted == 2
    assert len(await saved_rows(session)) == 2


async def test_different_title_is_not_a_copy(session):
    await save_vacancies(session, [ba_job()], {})
    result = await save_vacancies(session, [eures_job("e1", "Lagerist (m/w/d) (Fachlagerist/in)")], {})

    assert result.inserted == 1


async def test_different_company_is_not_a_copy(session):
    await save_vacancies(session, [ba_job()], {})
    result = await save_vacancies(session, [eures_job("e1", REAL_EURES_TITLE, company="Euromaster GmbH")], {})

    assert result.inserted == 1


async def test_without_a_company_nothing_is_linked_by_title_alone(session):
    await save_vacancies(session, [ba_job(company=None)], {})
    result = await save_vacancies(session, [eures_job("e1", REAL_EURES_TITLE, company=None)], {})

    assert result.inserted == 1
    assert result.merged == 0


@pytest.mark.parametrize("days", [3, -3])
async def test_copy_published_up_to_3_days_apart_is_linked(session, days):
    await save_vacancies(session, [ba_job()], {})
    posted_at = datetime(2026, 11, 2, tzinfo=UTC) + timedelta(days=days)
    result = await save_vacancies(session, [eures_job("e1", REAL_EURES_TITLE, posted_at=posted_at)], {})

    assert result.merged == 1


@pytest.mark.parametrize("delta", [timedelta(days=3, seconds=1), timedelta(days=-3, seconds=-1), timedelta(days=90)])
async def test_same_title_published_further_apart_stays_separate(session, delta):
    await save_vacancies(session, [ba_job()], {})
    posted_at = datetime(2026, 11, 2, tzinfo=UTC) + delta
    result = await save_vacancies(session, [eures_job("e1", REAL_EURES_TITLE, posted_at=posted_at)], {})

    assert result.inserted == 1
    assert result.merged == 0
    assert len(await saved_rows(session)) == 2


async def test_date_check_works_inside_one_batch(session):
    far = eures_job("e1", REAL_EURES_TITLE, posted_at=datetime(2026, 8, 1, tzinfo=UTC))
    result = await save_vacancies(session, [ba_job(), far], {})

    assert result.inserted == 2


async def test_same_job_in_two_regions_of_one_board_stays_separate(session):
    first = eures_job("e1", REAL_EURES_TITLE)
    first.location = "DE124"
    second = eures_job("e2", REAL_EURES_TITLE)
    second.location = "DEB35"
    fill_computed_fields(first)
    fill_computed_fields(second)

    result = await save_vacancies(session, [first, second], {})

    rows = await saved_rows(session)
    assert result.inserted == 2
    assert [row.location for row in rows] == ["DE124", "DEB35"]


def days_ago(days: int) -> datetime:
    return datetime.now(UTC) - timedelta(days=days)


async def test_repost_with_a_new_id_replaces_a_row_past_the_30_days(session):
    await save_vacancies(session, [make_vacancy("old", posted_at=days_ago(40))], {})

    result = await save_vacancies(session, [make_vacancy("new", posted_at=days_ago(1))], {})

    rows = await saved_rows(session)
    assert result.updated == 1
    assert result.skipped == 0
    assert len(rows) == 1
    assert rows[0].external_id == "new"
    assert rows[0].url == "https://eures.example/new"
    assert rows[0].posted_at.replace(tzinfo=UTC) > days_ago(2)


async def test_repost_from_another_board_takes_over_a_row_past_the_30_days(session):
    await save_vacancies(session, [make_vacancy("old", source="eures", posted_at=days_ago(40))], {})

    result = await save_vacancies(session, [make_vacancy("x", source="adzuna", posted_at=days_ago(1))], {})

    rows = await saved_rows(session)
    assert result.updated == 1
    assert (rows[0].source, rows[0].external_id) == ("adzuna", "x")


async def test_repeated_id_is_found_after_a_repost(session):
    await save_vacancies(session, [make_vacancy("old", posted_at=days_ago(40))], {})
    await save_vacancies(session, [make_vacancy("new", posted_at=days_ago(1))], {})

    result = await save_vacancies(session, [make_vacancy("new", posted_at=days_ago(1))], {})

    assert result.updated == 1
    assert len(await saved_rows(session)) == 1


async def test_duplicate_of_a_fresh_row_is_still_skipped(session):
    await save_vacancies(session, [make_vacancy("first", posted_at=days_ago(29))], {})

    result = await save_vacancies(session, [make_vacancy("second", posted_at=days_ago(1))], {})

    rows = await saved_rows(session)
    assert result.skipped == 1
    assert rows[0].external_id == "first"


async def test_old_vacancy_does_not_replace_an_old_row(session):
    await save_vacancies(session, [make_vacancy("first", posted_at=days_ago(40))], {})

    result = await save_vacancies(session, [make_vacancy("second", posted_at=days_ago(35))], {})

    assert result.skipped == 1
    assert (await saved_rows(session))[0].external_id == "first"


def no_company(external_id: str, source: str = "eures", city: str | None = None) -> NormalizedVacancy:
    vacancy = NormalizedVacancy(
        source=source,
        external_id=external_id,
        title="Koch",
        url=f"https://{source}.example/{external_id}",
        country_code="DE",
        city=city,
        posted_at=days_ago(1),
    )
    return fill_computed_fields(vacancy)


async def test_jobs_without_a_company_are_not_duplicates_of_each_other(session):
    result = await save_vacancies(session, [no_company("1"), no_company("2")], {})

    assert result.inserted == 2
    assert len(await saved_rows(session)) == 2


async def test_jobs_without_a_company_in_one_city_are_not_duplicates(session):
    result = await save_vacancies(session, [no_company("1", city="Berlin"), no_company("2", city="Berlin")], {})

    assert result.inserted == 2


async def test_jobs_without_a_company_on_two_boards_are_not_linked(session):
    result = await save_vacancies(session, [no_company("1"), no_company("1", source="adzuna")], {})

    assert result.inserted == 2
    assert result.merged == 0


async def test_job_without_a_company_is_updated_by_its_id(session):
    await save_vacancies(session, [no_company("1")], {})

    result = await save_vacancies(session, [no_company("1")], {})

    assert result.updated == 1
    assert len(await saved_rows(session)) == 1


async def test_row_can_take_a_fingerprint_another_row_gives_up_in_the_same_batch(session):
    first = make_vacancy("1", title="Python Developer")
    second = make_vacancy("2", title="Java Developer")
    await save_vacancies(session, [first, second], {})

    # Row 2 leaves "Java Developer" first, then row 1 takes it over
    second_renamed = make_vacancy("2", title="Golang Developer")
    first_renamed = make_vacancy("1", title="Java Developer")
    result = await save_vacancies(session, [second_renamed, first_renamed], {})

    rows = await saved_rows(session)
    assert result.updated == 2
    assert [row.fingerprint for row in rows] == [first_renamed.fingerprint, second_renamed.fingerprint]


async def test_long_list_is_saved_in_batches(session, monkeypatch):
    monkeypatch.setattr("app.services.vacancies.SAVE_BATCH_SIZE", 2)
    vacancies = [make_vacancy(str(i), title=f"Job {i}") for i in range(5)]

    result = await save_in_batches(session, vacancies, {})

    assert result.inserted == 5
    assert len(await saved_rows(session)) == 5


async def test_duplicate_in_a_later_batch_is_still_found(session, monkeypatch):
    monkeypatch.setattr("app.services.vacancies.SAVE_BATCH_SIZE", 1)

    result = await save_in_batches(session, [make_vacancy("1"), make_vacancy("2")], {})

    assert result.inserted == 1
    assert result.skipped == 1


async def test_one_row_takes_only_one_copy_from_another_board(session):
    """A chain posts the same title in many branches: they mustn't hide behind one card."""
    await save_vacancies(session, [ba_job()], {})

    result = await save_vacancies(session, [eures_job(f"e{i}", REAL_EURES_TITLE) for i in range(3)], {})

    rows = await saved_rows(session)
    assert result.merged == 1
    assert len(rows[0].other_sources) == 1
    # e1 and e2 have the same fingerprint as each other, so one row is added for them
    assert result.inserted == 1
    assert result.skipped == 1


async def test_two_copies_from_different_boards_can_link_to_one_row(session):
    await save_vacancies(session, [eures_job("e1", REAL_EURES_TITLE)], {})
    other = eures_job("x1", REAL_EURES_TITLE)
    other.source = "another_board"

    result = await save_vacancies(session, [ba_job(), other], {})

    assert result.merged == 2


async def test_known_copy_is_still_recognised_on_the_next_refresh(session):
    await save_vacancies(session, [ba_job(), eures_job("e1", REAL_EURES_TITLE)], {})

    result = await save_vacancies(session, [eures_job("e1", REAL_EURES_TITLE)], {})

    assert result.skipped == 1
    assert result.inserted == 0


@pytest.mark.parametrize(
    ("amount", "period", "expected"),
    [
        (19900.0, "hour", None),  # a monthly amount marked as hourly: 9 million a year
        (6.55, "month", None),  # an hourly amount marked as monthly: 79 a year
        (2500.0, "month", 30000),
        (115.0, "hour", 239200),
    ],
)
async def test_implausible_yearly_salary_is_not_shown(session, amount, period, expected):
    vacancy = make_vacancy(salary_min=amount, salary_currency="EUR", salary_period=period)
    await save_vacancies(session, [vacancy], {})

    row = (await saved_rows(session))[0]
    assert row.salary_annual_min_eur == expected
    assert row.salary_min == amount
