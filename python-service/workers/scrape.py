import asyncio

from workers.celery_app import celery_app
from app.models.schemas import ScrapeFilters
from app.scrapers.pipeline import run_scrape_pipeline


@celery_app.task(name="workers.scrape.run_scrape_task", bind=True, max_retries=3)
def run_scrape_task(self, filters: dict | None = None):
    try:
        result = asyncio.run(run_scrape_pipeline(ScrapeFilters(**(filters or {}))))
        return result.model_dump()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
