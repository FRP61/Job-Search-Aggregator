from app.integrations.eures import eures_location_code


def test_country_code_becomes_lowercase():
    assert eures_location_code("DE") == "de"


def test_greece_uses_its_eures_code():
    assert eures_location_code("GR") == "el"


def test_other_country_is_not_affected_by_greece():
    assert eures_location_code("FR") == "fr"
