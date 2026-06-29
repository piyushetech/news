from app.models.schemas import EnrichedArticle, RawArticle, ScrapeFilters, ScrapeJobResult
from app.scrapers.rss_ingest import filter_feeds, scrape_with_filters
from app.scrapers.sources import RSS_SOURCES, SCRAPE_CITIES
from app.ai.enrichment import enrich_article


async def run_scrape_pipeline(filters: ScrapeFilters | None = None) -> ScrapeJobResult:
    filters = filters or ScrapeFilters()
    raw_articles, errors, feeds_matched = await scrape_with_filters(filters)

    enriched: list[EnrichedArticle] = []
    skipped = 0

    feed_lookup = {f["url"]: f for f in RSS_SOURCES}
    for raw in raw_articles:
        meta = feed_lookup.get(raw.feed_url or "", {})
        try:
            article = await enrich_article(raw, meta)
            enriched.append(article)
        except Exception as exc:
            errors.append(f"{raw.link}: {exc}")
            skipped += 1

    return ScrapeJobResult(
        created=len(enriched),
        skipped=skipped,
        repaired=0,
        errors=errors,
        feeds_matched=feeds_matched,
        filters=filters,
        articles=enriched,
    )


def get_scrape_options() -> dict:
    categories = sorted({f["category"] for f in RSS_SOURCES})
    countries = sorted({f["country"] for f in RSS_SOURCES if f.get("country")})
    languages = sorted({f["language"] for f in RSS_SOURCES if f.get("language")})
    return {
        "categories": categories,
        "cities": SCRAPE_CITIES,
        "countries": countries,
        "languages": languages,
    }
