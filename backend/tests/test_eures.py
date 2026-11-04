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


ISCO = "http://data.europa.eu/esco/isco/C"
OCCUPATION = "http://data.europa.eu/esco/occupation/0ededdc2"


def job_with_codes(codes, title="Pracownik") -> dict:
    return {"id": "1", "title": title, "creationDate": 1793622360191, "jobCategoriesCodes": codes}


def test_industry_comes_from_the_isco_code_in_any_language():
    assert parse_eures_job(job_with_codes([ISCO + "7126"], "Monter rurociągów"), "DE").industry == "construction"


def test_first_code_with_an_industry_wins():
    codes = [OCCUPATION, ISCO + "6111", ISCO + "2512", ISCO + "7126"]
    assert parse_eures_job(job_with_codes(codes), "DE").industry == "it"


def test_without_a_useful_code_the_title_is_used():
    job = job_with_codes([OCCUPATION], "Python Developer")
    assert parse_eures_job(job, "DE").industry == "it"


def test_empty_codes_fall_back_to_the_title():
    assert parse_eures_job(job_with_codes(None, "Python Developer"), "DE").industry == "it"
    assert parse_eures_job(job_with_codes([], "Florist"), "DE").industry == "other"
