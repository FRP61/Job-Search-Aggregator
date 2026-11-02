import pytest

from app.integrations.base import NormalizedVacancy, fill_computed_fields
from app.services.normalize import fingerprint


def make_vacancy(**fields):
    required = {
        "source": "eures",
        "external_id": "123",
        "title": "Senior Python Developer (m/w/d)",
        "url": "https://example.com/jobs/123",
        "country_code": "DE",
    }
    return NormalizedVacancy(**{**required, **fields})


def test_vacancy_keeps_required_fields():
    vacancy = make_vacancy()
    assert vacancy.source == "eures"
    assert vacancy.external_id == "123"
    assert vacancy.title == "Senior Python Developer (m/w/d)"
    assert vacancy.url == "https://example.com/jobs/123"
    assert vacancy.country_code == "DE"


def test_optional_fields_have_defaults():
    vacancy = make_vacancy()
    assert vacancy.company is None
    assert vacancy.city is None
    assert vacancy.description is None
    assert vacancy.industry is None
    assert vacancy.salary_min is None
    assert vacancy.salary_max is None
    assert vacancy.salary_currency is None
    assert vacancy.salary_period is None
    assert vacancy.remote is False
    assert vacancy.fingerprint == ""


def test_optional_fields_can_be_set():
    vacancy = make_vacancy(company="Zalando SE", city="Berlin", remote=True, salary_min=50000.0)
    assert vacancy.company == "Zalando SE"
    assert vacancy.city == "Berlin"
    assert vacancy.remote is True
    assert vacancy.salary_min == 50000.0


def test_required_field_cannot_be_skipped():
    with pytest.raises(TypeError):
        NormalizedVacancy(source="eures")


def test_missing_industry_is_guessed_from_title():
    vacancy = fill_computed_fields(make_vacancy())
    assert vacancy.industry == "it"


def test_industry_from_the_board_is_kept():
    vacancy = fill_computed_fields(make_vacancy(industry="finance"))
    assert vacancy.industry == "finance"


def test_fingerprint_is_computed():
    vacancy = fill_computed_fields(make_vacancy(company="Zalando SE", city="Berlin"))
    assert vacancy.fingerprint == fingerprint("Senior Python Developer (m/w/d)", "Zalando SE", "DE", "Berlin")


def test_same_vacancy_from_two_boards_gets_same_fingerprint():
    first = fill_computed_fields(make_vacancy(company="Zalando SE", city="Berlin"))
    second = fill_computed_fields(
        make_vacancy(source="arbeitsagentur", external_id="x9", title="senior python developer",
                     company="Zalando", city="berlin", country_code="de")
    )
    assert first.fingerprint == second.fingerprint
