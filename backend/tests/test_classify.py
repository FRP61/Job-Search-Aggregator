from app.services.classify import matches_keyword


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
