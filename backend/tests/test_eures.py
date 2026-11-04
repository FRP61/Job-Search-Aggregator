from datetime import UTC, datetime

import pytest

from app.integrations.eures import parse_eures_job
from app.services.normalize import fingerprint

# A job as EURES really returns it (description shortened)
VOLVO_JOB = {
    "title": "Senior Sales Manager BESS Germany & Central Europe",
    "description": "Volvo Energy is one of the Volvo Group's newest business areas",
    "id": "NjM2OTg3OCAxMjE",
    "creationDate": 1793622360191,
    "locationMap": {"DE": [None]},
    "positionScheduleCodes": ["fulltime"],
    "employer": {"name": "Volvo Business Services Aktiebolag", "website": None},
    "availableLanguages": ["en"],
}


def test_source_is_eures():
    assert parse_eures_job(VOLVO_JOB, "DE").source == "eures"


def test_id_and_title_are_copied():
    vacancy = parse_eures_job(VOLVO_JOB, "DE")
    assert vacancy.external_id == "NjM2OTg3OCAxMjE"
    assert vacancy.title == "Senior Sales Manager BESS Germany & Central Europe"


def test_url_leads_to_the_job_page():
    vacancy = parse_eures_job(VOLVO_JOB, "DE")
    assert vacancy.url == "https://europa.eu/eures/portal/jv-se/jv-details/NjM2OTg3OCAxMjE?lang=en"


def test_country_comes_from_the_request():
    assert parse_eures_job(VOLVO_JOB, "AT").country_code == "AT"


def test_company_is_read_from_nested_employer():
    assert parse_eures_job(VOLVO_JOB, "DE").company == "Volvo Business Services Aktiebolag"


def test_description_is_copied():
    assert parse_eures_job(VOLVO_JOB, "DE").description.startswith("Volvo Energy")


def test_job_without_employer_has_no_company():
    job = {"id": "1", "title": "Koch", "creationDate": 1793622360191}
    assert parse_eures_job(job, "DE").company is None


def test_job_without_description_has_no_description():
    job = {"id": "1", "title": "Koch", "creationDate": 1793622360191}
    assert parse_eures_job(job, "DE").description is None


def test_computed_fields_are_filled():
    vacancy = parse_eures_job(VOLVO_JOB, "DE")
    assert vacancy.industry == "sales"
    assert vacancy.fingerprint == fingerprint(
        "Senior Sales Manager BESS Germany & Central Europe",
        "Volvo Business Services Aktiebolag",
        "DE",
        None,
    )


def test_posted_at_is_converted_from_milliseconds():
    job = {"id": "1", "title": "Cook", "creationDate": 1793622360191}
    posted_at = parse_eures_job(job, "DE").posted_at
    assert posted_at == datetime(2026, 11, 2, 12, 26, 0, 191000, tzinfo=UTC)


def test_job_without_a_date_is_rejected():
    with pytest.raises(KeyError):
        parse_eures_job({"id": "1", "title": "Cook"}, "DE")
