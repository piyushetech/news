import pytest

from app.models.schemas import ScrapeFilters
from app.scrapers.rss_ingest import filter_feeds


def test_filter_by_category():
    feeds = filter_feeds(ScrapeFilters(category="Cricket"))
    assert len(feeds) >= 1
    assert all(f["category"] == "Cricket" for f in feeds)


def test_filter_by_city():
    feeds = filter_feeds(ScrapeFilters(city="Mumbai"))
    assert len(feeds) >= 1
    assert all("Mumbai" in (f.get("city") or "") for f in feeds)


def test_filter_no_match():
    feeds = filter_feeds(ScrapeFilters(category="NonExistentCategoryXYZ"))
    assert feeds == []
