from app.services.normalize import normalize_title


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
