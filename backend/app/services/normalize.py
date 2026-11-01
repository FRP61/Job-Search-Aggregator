"""Bring text from different job boards to one form, so the same vacancy
posted on two boards can be recognised as a duplicate."""

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

