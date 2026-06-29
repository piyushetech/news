from contextlib import asynccontextmanager

from fastapi import FastAPI
from prometheus_client import make_asgi_app

from app import __version__
from app.api.routes import health, internal


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="BriefNews Python Service",
    description="Scraping, AI enrichment, and ML recommendations for BriefNews News",
    version=__version__,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.include_router(health.router)
app.include_router(internal.router)

metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)
