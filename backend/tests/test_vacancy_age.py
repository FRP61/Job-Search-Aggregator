from datetime import UTC, datetime, timedelta

from app.integrations.base import NormalizedVacancy

NOW = datetime(2026, 11, 4, 12, 0, tzinfo=UTC)


def vacancy_posted(posted_at: datetime | None = None) -> NormalizedVacancy:
    return NormalizedVacancy(
        source="test", external_id="1", title="Cook", url="https://example.com", country_code="DE", posted_at=posted_at
    )


def test_date_is_optional():
    assert vacancy_posted().posted_at is None


def test_yesterday_is_not_too_old():
    assert not vacancy_posted(NOW - timedelta(days=1)).is_too_old(NOW)


def test_exactly_30_days_is_not_too_old():
    assert not vacancy_posted(NOW - timedelta(days=30)).is_too_old(NOW)


def test_just_over_30_days_is_too_old():
    assert vacancy_posted(NOW - timedelta(days=30, seconds=1)).is_too_old(NOW)


def test_no_date_is_not_too_old():
    assert not vacancy_posted(None).is_too_old(NOW)


def test_max_age_can_be_changed():
    assert vacancy_posted(NOW - timedelta(days=8)).is_too_old(NOW, max_age_days=7)
