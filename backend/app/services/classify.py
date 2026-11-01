"""Guess a vacancy's industry from its title using the keywords in app/data/industries.py."""


def matches_keyword(title: str, keyword: str) -> bool:
    """Does a normalized (lowercase) job title contain this industry keyword?

    Three kinds of keywords:
      "python"          one word: must be a whole word of the title
      "data scientist"  phrase (has a space): must appear in the title as is
      "entwickl*"       stem (ends with *): some word of the title starts with it

    matches_keyword("senior python developer", "python")         -> True
    matches_keyword("three engineers", "hr")                     -> False  ("hr" hides inside "three")
    matches_keyword("senior data scientist", "data scientist")   -> True
    matches_keyword("java entwickler", "entwickl*")              -> True
    """

    words = title.split()

    if keyword.endswith("*"):
        stem = keyword.removesuffix("*")
        for word in words:
            if word.startswith(stem):
                return True
        return False

    if " " in keyword:
        return keyword in title
    return keyword in words
    

