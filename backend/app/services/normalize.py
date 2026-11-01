"""Bring text from different job boards to one form, so the same vacancy
posted on two boards can be recognised as a duplicate."""

import hashlib

# Gender markers that job ads add to titles by law or custom:
# German (m/w/d), English (m/f/d), French (h/f), Polish (k/m).
# They carry no meaning for matching, so we cut them out.
GENDER_MARKERS = [
    "(m/w/d)",
    "(w/m/d)",
    "(m/f/d)",
    "(f/m/d)",
    "(m/w/x)",
    "(h/f)",
    "(f/h)",
    "(k/m)",
    "(m/k)",
]


def normalize_title(title: str) -> str:
    """Make a job title comparable across boards.

    normalize_title("Senior Python Developer (m/w/d)") -> "senior python developer"
    normalize_title("  Python   Developer ")           -> "python developer"
    normalize_title("Koch (M/W/D)")                    -> "koch"
    """

    title = title.lower()
    for marker in GENDER_MARKERS:
        title = title.replace(marker, "")
    title = " ".join(title.split())
    return title


# Legal-form endings of company names across the EU. Each starts with a space,
# so only a whole last word matches: "zalando se" loses " se", "seat" does not.
# Longer endings come first, so "gmbh & co. kg" is removed whole, not just " kg".
LEGAL_SUFFIXES = [
    " gmbh & co. kg",
    " sp. z o.o.",
    " s.p.a.",
    " s.r.o.",
    " s.r.l.",
    " gmbh",
    " ltd.",
    " ltd",
    " inc.",
    " inc",
    " llc",
    " plc",
    " s.a.",
    " b.v.",
    " n.v.",
    " s.l.",
    " a/s",
    " ag",
    " se",
    " kg",
    " sa",
    " bv",
    " oy",
    " ab",
]


def normalize_company(company: str | None) -> str:
    """Make a company name comparable across boards.

    normalize_company("Zalando SE")                    -> "zalando"
    normalize_company("SAP Deutschland GmbH & Co. KG") -> "sap deutschland"
    normalize_company("Acme, Inc.")                    -> "acme"
    normalize_company(None)                            -> ""   (board gave no company)
    """

    if company is None:
        return ""
    company = " ".join(company.lower().split())
    for suffix in LEGAL_SUFFIXES:
        company = company.removesuffix(suffix)
    company = company.strip(" ,")
    return company


def fingerprint(title: str, company: str | None, country_code: str, city: str | None) -> str:
    """Identity of a vacancy across job boards: 40 hex characters.

    Two postings with the same normalized title, company, country and city
    get the same fingerprint, so the database can reject the second one.

    fingerprint("Senior Python Developer (m/w/d)", "Zalando SE", "DE", "Berlin")
    == fingerprint("senior python developer", "Zalando", "de", "berlin")
    """
    title = normalize_title(title)
    company = normalize_company(company)
    country_code = country_code.upper()
    if city is None:
        city = ""
    city = " ".join(city.lower().split())
    raw = "|".join([title, company, country_code, city])
    return hashlib.sha1(raw.encode()).hexdigest()


