import re
from html import unescape
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import feedparser
import httpx

from app.core.config import settings
from app.core.logging import log
from app.models.schemas import RawArticle, ScrapeFilters
from app.scrapers.sources import RSS_SOURCES

CITY_ALIASES = {
    "bangalore": ["bangalore", "bengaluru"],
    "mumbai": ["mumbai", "bombay"],
    "delhi": ["delhi", "new delhi", "ncr"],
    "kolkata": ["kolkata", "calcutta"],
    "chennai": ["chennai", "madras"],
    "hyderabad": ["hyderabad"],
    "pune": ["pune", "pimpri"],
    "kochi": ["kochi", "cochin", "ernakulam"],
}


def _resolve_city_terms(city: str) -> list[str]:
    normalized = city.lower().strip()
    terms = {normalized}
    for key, aliases in CITY_ALIASES.items():
        all_names = [key, *aliases]
        if any(normalized in a or a in normalized for a in all_names):
            terms.update(all_names)
    return list(terms)


def _feed_matches_city(feed_city: str | None, city: str) -> bool:
    if not feed_city or not city:
        return False
    if city == "National":
        return feed_city == "National"
    feed_lower = feed_city.lower()
    return any(
        feed_lower == term or term in feed_lower or feed_lower in term
        for term in _resolve_city_terms(city)
    )


def _strip_html(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    return unescape(re.sub(r"\s+", " ", text)).strip()


def _extract_image(entry: dict) -> str | None:
    if entry.get("media_content"):
        for media in entry.media_content:
            url = media.get("url")
            if url and "image" in (media.get("type") or ""):
                return url
    if entry.get("media_thumbnail"):
        return entry.media_thumbnail[0].get("url")
    links = entry.get("links") or []
    for link in links:
        if link.get("type", "").startswith("image"):
            return link.get("href")
    return None


def filter_feeds(filters: ScrapeFilters | None = None) -> list[dict]:
    filters = filters or ScrapeFilters()
    feeds = RSS_SOURCES

    def match(feed: dict) -> bool:
        if filters.category and feed.get("category") != filters.category:
            return False
        if filters.categories and feed.get("category") not in filters.categories:
            return False
        if filters.country and feed.get("country") != filters.country.upper():
            return False
        if filters.language and feed.get("language") != filters.language:
            return False
        if filters.city:
            if filters.city == "National":
                if feed.get("category") != "National" and feed.get("city") != "National":
                    return False
            elif not _feed_matches_city(feed.get("city"), filters.city):
                return False
        return True

    return [f for f in feeds if match(f)]


def _robots_allowed(url: str) -> bool:
    if not settings.respect_robots_txt:
        return True
    try:
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        rp = RobotFileParser()
        rp.set_url(robots_url)
        rp.read()
        return rp.can_fetch(settings.scrape_user_agent, url)
    except Exception:
        return True


async def fetch_rss_feed(feed_config: dict) -> list[RawArticle]:
    url = feed_config["url"]
    if not _robots_allowed(url):
        log.warning("robots_blocked", url=url)
        return []

    async with httpx.AsyncClient(timeout=settings.scrape_timeout_seconds) as client:
        response = await client.get(url, headers={"User-Agent": settings.scrape_user_agent})
        response.raise_for_status()
        parsed = feedparser.parse(response.text)

    articles: list[RawArticle] = []
    for entry in parsed.entries[: settings.scrape_max_items_per_feed]:
        link = entry.get("link") or ""
        title = _strip_html(entry.get("title") or "")
        if not link or not title:
            continue

        description = _strip_html(
            entry.get("summary") or entry.get("description") or ""
        )
        pub = entry.get("published") or entry.get("updated")

        articles.append(
            RawArticle(
                title=title,
                link=link,
                description=description,
                pub_date=pub,
                image_url=_extract_image(entry),
                author=(entry.get("author") or None),
                source=feed_config.get("source", "Unknown"),
                category=feed_config.get("category", "General"),
                region=feed_config.get("region"),
                country=feed_config.get("country"),
                language=feed_config.get("language", "en"),
                city=feed_config.get("city"),
                feed_url=url,
            )
        )
    return articles


async def scrape_with_filters(filters: ScrapeFilters | None = None) -> tuple[list[RawArticle], list[str], int]:
    feeds = filter_feeds(filters)
    errors: list[str] = []
    articles: list[RawArticle] = []

    if not feeds:
        errors.append("No RSS feeds matched the selected filters.")
        return articles, errors, 0

    for feed in feeds:
        try:
            items = await fetch_rss_feed(feed)
            articles.extend(items)
        except Exception as exc:
            errors.append(f"{feed['url']}: {exc}")
            log.error("feed_fetch_failed", url=feed["url"], error=str(exc))

    return articles, errors, len(feeds)
