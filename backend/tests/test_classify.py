import pytest

from app.services.classify import classify_industry, matches_keyword


def test_whole_word_matches():
    assert matches_keyword("senior python developer", "python") is True


def test_missing_word_does_not_match():
    assert matches_keyword("senior python developer", "java") is False


def test_short_word_matches_as_whole_word():
    assert matches_keyword("hr manager", "hr") is True


def test_short_word_hidden_inside_another_word_does_not_match():
    # "three" contains the letters "hr", but it is not the word "hr"
    assert matches_keyword("three engineers", "hr") is False


def test_phrase_matches():
    assert matches_keyword("senior data scientist", "data scientist") is True


def test_phrase_words_apart_do_not_match():
    assert matches_keyword("data engineer and scientist", "data scientist") is False


def test_stem_matches_word_start():
    assert matches_keyword("java entwickler", "entwickl*") is True


def test_stem_matches_other_word_forms():
    assert matches_keyword("leiter entwicklung", "entwickl*") is True


def test_stem_in_ukrainian():
    assert matches_keyword("програміст python", "програміст*") is True


def test_stem_that_no_word_starts_with_does_not_match():
    assert matches_keyword("python developer", "entwickl*") is False


def test_python_developer_is_it():
    assert classify_industry("Senior Python Developer (m/w/d)") == "it"


def test_german_stem_finds_finance():
    assert classify_industry("Buchhalter (m/w/d)") == "finance"


def test_polish_stem_finds_logistics():
    assert classify_industry("Kierowca kat. C") == "logistics"


def test_ukrainian_stem_finds_hospitality():
    assert classify_industry("Кухар") == "hospitality"


def test_capital_letters_do_not_matter():
    assert classify_industry("MECHANICAL ENGINEER") == "engineering"


def test_first_industry_in_the_list_wins():
    # "software" is in "it" and "engineer" is in "engineering"; "it" comes first
    assert classify_industry("Software Engineer") == "it"


def test_no_keyword_gives_other():
    assert classify_industry("Florist") == "other"


def test_word_next_to_punctuation_matches():
    assert matches_keyword("entwickler (python), berlin", "python") is True


def test_stem_after_a_hyphen_matches():
    assert matches_keyword("java-entwickler", "entwickl*") is True


def test_stem_after_a_slash_matches():
    assert matches_keyword("koch/entwickler", "entwickl*") is True


def test_stem_inside_a_word_does_not_match():
    assert matches_keyword("softwareentwickler", "entwickl*") is False


def test_part_matches_inside_a_compound_word():
    assert matches_keyword("bilanzbuchhalter", "*buchhalt*") is True


def test_part_that_is_absent_does_not_match():
    assert matches_keyword("koch", "*buchhalt*") is False


def test_phrase_hidden_inside_a_longer_word_does_not_match():
    assert matches_keyword("audit support specialist", "it support") is False
    assert matches_keyword("credit support officer", "it support") is False


def test_hyphenated_keyword_still_matches():
    assert matches_keyword("senior full-stack engineer", "full-stack") is True


@pytest.mark.parametrize(
    ("title", "industry"),
    [
        ("Java-Entwickler", "it"),
        ("Softwareentwickler (m/w/d)", "it"),
        ("IT-Systemadministrator/in", "it"),
        ("ERP-Berater/in - ERP-Consultant", "it"),
        ("Bilanzbuchhalter/in", "finance"),
        ("Audit Support Specialist", "finance"),
        ("Physiotherapeut/in", "healthcare"),
        ("Heilerziehungspfleger/in", "healthcare"),
        ("Innendienstverkäufer (m/w/d)", "sales"),
        ("Fachlagerist/in", "logistics"),
        ("Berufskraftfahrer/in", "logistics"),
        ("Industriemechaniker/in", "manufacturing"),
        ("Maschinenführer (m/w/d)", "manufacturing"),
        ("Anlagenmechaniker/in - Sanitär", "construction"),
        ("Personalsachbearbeiter/in", "hr"),
    ],
)
def test_german_titles(title, industry):
    assert classify_industry(title) == industry


@pytest.mark.parametrize("title", ["Erfahrener Mitarbeiter (m/w/d)", "Fahrzeugpfleger/in"])
def test_look_alike_words_do_not_match(title):
    assert classify_industry(title) == "other"
