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


def test_job_with_an_isco_industry_needs_no_lookup():
    job = job_with_codes([OCCUPATION, ISCO + "2512"])
    assert parse_eures_job(job, "DE").occupation_uris == []


def test_job_without_an_isco_industry_keeps_occupations_for_the_lookup():
    job = job_with_codes([ISCO + "6111", OCCUPATION])
    assert parse_eures_job(job, "DE").occupation_uris == [OCCUPATION]


def job_in_regions(location_map: dict, company: str = "Euromaster GmbH") -> dict:
    return {
        "id": "1",
        "title": "Innendienstverkäufer",
        "creationDate": 1793622360191,
        "employer": {"name": company},
        "locationMap": location_map,
    }


def test_location_is_the_region_code():
    assert parse_eures_job(job_in_regions({"DE": ["DE124"]}), "DE").location == "DE124"


def test_several_regions_are_sorted_and_joined():
    vacancy = parse_eures_job(job_in_regions({"DE": ["DED", "DE40", "DE300"]}), "DE")
    assert vacancy.location == "DE300,DE40,DED"


def test_only_the_regions_of_the_asked_country_count():
    vacancy = parse_eures_job(job_in_regions({"DE": ["DE124"], "AT": ["AT13"]}), "AT")
    assert vacancy.location == "AT13"


def test_greece_is_under_el_in_the_location_map():
    assert parse_eures_job(job_in_regions({"EL": ["EL30"]}), "GR").location == "EL30"


@pytest.mark.parametrize("location_map", [{"DE": [None]}, {"DE": []}, {}, None])
def test_no_region_gives_no_location(location_map):
    assert parse_eures_job(job_in_regions(location_map), "DE").location is None


def test_same_job_in_different_regions_has_different_fingerprints():
    first = parse_eures_job(job_in_regions({"DE": ["DE124"]}), "DE")
    second = parse_eures_job(job_in_regions({"DE": ["DEB35"]}), "DE")
    assert first.fingerprint != second.fingerprint


def test_region_does_not_change_the_loose_fingerprint():
    first = parse_eures_job(job_in_regions({"DE": ["DE124"]}), "DE")
    second = parse_eures_job(job_in_regions({"DE": ["DEB35"]}), "DE")
    assert first.loose_fingerprint == second.loose_fingerprint
