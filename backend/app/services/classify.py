"""Guess a vacancy's industry from its title using the keywords in app/data/industries.py."""

import re

from app.data.industries import INDUSTRIES, ISCO_TO_INDUSTRY
from app.services.normalize import normalize_title

def matches_keyword(title: str, keyword: str) -> bool:
    """Does a normalized (lowercase) job title contain this industry keyword?

    Four kinds of keywords:
      "python"          one word: must be a whole word of the title
      "data scientist"  phrase (has a space): must appear as whole words
      "entwickl*"       stem (ends with *): some word of the title starts with it
      "*buchhalt*"      part (* on both sides): anywhere, for German compound words

    A word ends at anything that isn't a letter or digit, so "java-entwickler"
    and "(python)," count, and "audit support" doesn't contain "it support".

    matches_keyword("senior python developer", "python")         -> True
    matches_keyword("three engineers", "hr")                     -> False  ("hr" hides inside "three")
    matches_keyword("senior data scientist", "data scientist")   -> True
    matches_keyword("java-entwickler", "entwickl*")              -> True
    matches_keyword("bilanzbuchhalter", "*buchhalt*")            -> True
    """

    if keyword.startswith("*") and keyword.endswith("*"):
        return keyword.strip("*") in title
    if keyword.endswith("*"):
        return re.search(r"(?<!\w)" + re.escape(keyword.removesuffix("*")), title) is not None
    return re.search(r"(?<!\w)" + re.escape(keyword) + r"(?!\w)", title) is not None


def classify_industry(title: str) -> str:
    """Guess the industry slug of a job title. The first matching keyword wins,
    so the order of INDUSTRIES matters. No match gives "other".

    classify_industry("Senior Python Developer (m/w/d)") -> "it"
    classify_industry("Kierowca kat. C")                 -> "logistics"
    classify_industry("Florist")                         -> "other"
    """

    title = normalize_title(title)
    for industry in INDUSTRIES:
        for keyword in industry.keywords:
            if matches_keyword(title, keyword):
                return industry.slug
    return "other"


def industry_from_isco(code: str) -> str | None:
    """The industry slug of an ISCO occupation code, or None if it has none.

    The most exact prefix wins, and a broader group code works too.

    industry_from_isco("2512") -> "it"
    industry_from_isco("5244") -> "customer-service"   (not "retail", the "52" group)
    industry_from_isco("25")   -> "it"
    industry_from_isco("6111") -> None                  (farming isn't in our list)
    """
    for length in range(len(code), 0, -1):
        industry = ISCO_TO_INDUSTRY.get(code[:length])
        if industry is not None:
            return industry
    return None
