import pytest

from app.data.industries import INDUSTRY_BY_SLUG, ISCO_TO_INDUSTRY
from app.services.classify import industry_from_isco


@pytest.mark.parametrize(
    ("code", "industry"),
    [
        ("2512", "it"),  # software developers
        ("2212", "healthcare"),  # doctors
        ("7126", "construction"),  # plumbers and pipe fitters
        ("8322", "logistics"),  # car and taxi drivers
        ("3313", "finance"),  # bookkeepers
        ("4120", "admin"),  # secretaries
        ("5120", "hospitality"),  # cooks
    ],
)
def test_common_occupations(code, industry):
    assert industry_from_isco(code) == industry


def test_most_exact_prefix_wins():
    assert industry_from_isco("5223") == "retail"
    assert industry_from_isco("5244") == "customer-service"


def test_broader_group_code_works():
    assert industry_from_isco("25") == "it"
    assert industry_from_isco("251") == "it"


def test_occupation_outside_our_list_gives_none():
    assert industry_from_isco("6111") is None


def test_group_too_broad_to_decide_gives_none():
    assert industry_from_isco("2") is None


def test_empty_code_gives_none():
    assert industry_from_isco("") is None


def test_every_mapped_industry_exists():
    assert set(ISCO_TO_INDUSTRY.values()) <= set(INDUSTRY_BY_SLUG)
