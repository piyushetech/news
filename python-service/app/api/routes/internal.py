from fastapi import APIRouter, Depends

from app.core.security import verify_internal_key
from app.models.schemas import (
    DeepDiveRequest,
    DeepDiveResponse,
    RecommendRequest,
    RecommendResponse,
    ScrapeFilters,
    ScrapeJobResult,
)
from app.ai.deep_dive import build_deep_dive
from app.scrapers.pipeline import get_scrape_options, run_scrape_pipeline
from app.ai.recommendations import get_recommendations

router = APIRouter(prefix="/internal", tags=["internal"], dependencies=[Depends(verify_internal_key)])


@router.post("/scrape", response_model=ScrapeJobResult)
async def scrape_news(filters: ScrapeFilters | None = None) -> ScrapeJobResult:
    return await run_scrape_pipeline(filters)


@router.get("/scrape/options")
async def scrape_options():
    return {"status": "success", "data": get_scrape_options()}


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(req: RecommendRequest) -> RecommendResponse:
    return await get_recommendations(req)


@router.post("/deep-dive", response_model=DeepDiveResponse)
async def deep_dive(req: DeepDiveRequest) -> DeepDiveResponse:
    return await build_deep_dive(req)


@router.post("/enrich")
async def enrich_batch(articles: list[dict]):
    """Enrich raw articles sent from Node.js legacy scraper."""
    from app.models.schemas import RawArticle
    from app.ai.enrichment import enrich_article

    results = []
    for item in articles:
        raw = RawArticle(**item)
        enriched = await enrich_article(raw)
        results.append(enriched.model_dump())
    return {"status": "success", "data": results}
