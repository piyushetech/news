from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "BriefNews",
    broker=settings.celery_broker_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "workers.scrape.run_scrape_task": {"queue": "scrape"},
        "workers.ai.run_enrich_task": {"queue": "ai"},
    },
)

celery_app.autodiscover_tasks(["workers"])
