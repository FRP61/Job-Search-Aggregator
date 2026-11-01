import hashlib

from app.services.normalize import fingerprint, normalize_company, normalize_title


def test_title_becomes_lowercase():
    assert normalize_title("Senior Python Developer") == "senior python developer"


def test_german_gender_marker_is_removed():
    assert normalize_title("Senior Python Developer (m/w/d)") == "senior python developer"


def test_french_gender_marker_is_removed():
    assert normalize_title("Développeur Python (H/F)") == "développeur python"


def test_marker_in_capital_letters_is_removed():
    assert normalize_title("Koch (M/W/D)") == "koch"


def test_extra_spaces_are_removed():
    assert normalize_title("  Python   Developer ") == "python developer"


def test_same_vacancy_from_two_boards_matches():
    from_board_a = normalize_title("Senior Python Developer (m/w/d)")
    from_board_b = normalize_title("senior  python developer")
    assert from_board_a == from_board_b


def test_german_legal_form_is_removed():
    assert normalize_company("Zalando SE") == "zalando"


def test_polish_legal_form_is_removed():
    assert normalize_company("Allegro sp. z o.o.") == "allegro"


def test_long_legal_form_is_removed_whole():
    assert normalize_company("SAP Deutschland GmbH & Co. KG") == "sap deutschland"


def test_legal_form_letters_inside_a_word_stay():
    # "seat" starts with "se", but " se" is not at the end, so nothing is cut
    assert normalize_company("Seat Cupra") == "seat cupra"


def test_comma_before_legal_form_is_removed():
    assert normalize_company("Acme, Inc.") == "acme"


def test_extra_spaces_are_removed_from_company():
    assert normalize_company("  Bosch   GmbH ") == "bosch"


def test_missing_company_gives_empty_string():
    assert normalize_company(None) == ""


def test_same_company_from_two_boards_matches():
    assert normalize_company("Siemens AG") == normalize_company("siemens")


def test_fingerprint_is_40_hex_characters():
    result = fingerprint("Python Developer", "Bosch GmbH", "DE", "Stuttgart")
    assert len(result) == 40
    assert all(ch in "0123456789abcdef" for ch in result)


def test_fingerprint_is_sha1_of_normalized_parts_joined_with_bar():
    expected = hashlib.sha1("python developer|bosch|DE|stuttgart".encode()).hexdigest()
    assert fingerprint("Python Developer", "Bosch GmbH", "DE", "Stuttgart") == expected


def test_same_vacancy_from_two_boards_has_same_fingerprint():
    from_eures = fingerprint("Senior Python Developer (m/w/d)", "Zalando SE", "DE", "Berlin")
    from_arbeitsagentur = fingerprint("senior  python developer", "Zalando", "de", "berlin")
    assert from_eures == from_arbeitsagentur


def test_different_city_means_different_vacancy():
    assert fingerprint("Koch", "Hilton", "DE", "Berlin") != fingerprint("Koch", "Hilton", "DE", "Munich")


def test_missing_company_and_city_still_give_fingerprint():
    assert len(fingerprint("Koch", None, "AT", None)) == 40


def test_separator_keeps_parts_apart():
    # Without "|" both would be "abc|..." -> the same fingerprint for different vacancies
    assert fingerprint("ab", "c", "DE", None) != fingerprint("a", "bc", "DE", None)
