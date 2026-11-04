from datetime import UTC, datetime, timedelta

from app.integrations.base import NormalizedVacancy, is_published_recently

NOW = datetime(2026, 11, 4, 12, 0, tzinfo=UTC)


def vacancy_posted(posted_at: datetime | None) -> NormalizedVacancy:
    return NormalizedVacancy(
        source="test", external_id="1", title="Cook", url="https://example.com", country_code="DE", posted_at=posted_at
    )


def test_yesterday_is_recent():
    assert is_published_recently(vacancy_posted(NOW - timedelta(days=1)), NOW)


def test_exactly_30_days_ago_is_still_recent():
    assert is_published_recently(vacancy_posted(NOW - timedelta(days=30)), NOW)


def test_31_days_ago_is_not_recent():
    assert not is_published_recently(vacancy_posted(NOW - timedelta(days=31)), NOW)


def test_no_date_is_not_recent():
    assert not is_published_recently(vacancy_posted(None), NOW)


def test_max_age_can_be_changed():
    assert not is_published_recently(vacancy_posted(NOW - timedelta(days=8)), NOW, max_age_days=7)
