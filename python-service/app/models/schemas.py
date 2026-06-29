from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class ScrapeFilters(BaseModel):
    category: str | None = None
    categories: list[str] | None = None
    city: str | None = None
    country: str | None = None
    language: str | None = None
    source_ids: list[str] | None = None


class RawArticle(BaseModel):
    title: str
    link: str
    description: str = ""
    pub_date: str | None = None
    image_url: str | None = None
    author: str | None = None
    source: str
    category: str = "General"
    region: str | None = None
    country: str | None = None
    language: str = "en"
    city: str | None = None
    feed_url: str | None = None


class EnrichedArticle(BaseModel):
    heading: str = Field(max_length=200)
    paragraph: str = Field(max_length=2000)
    full_content: str | None = Field(default=None, max_length=500)
    category: str
    source: str
    original_link: str
    canonical_url: str | None = None
    image_url: str | None = None
    og_image: str | None = None
    author: str | None = None
    language: str = "en"
    country: str | None = None
    region: str | None = None
    city: str | None = None
    tags: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    reading_time_minutes: int = 1
    published_at: datetime | None = None
    ai: dict[str, Any] = Field(default_factory=dict)
    entities: dict[str, list[str]] = Field(default_factory=dict)
    is_trending: bool = False
    is_controversial: bool = False


class ScrapeJobResult(BaseModel):
    created: int = 0
    skipped: int = 0
    repaired: int = 0
    errors: list[str] = Field(default_factory=list)
    feeds_matched: int = 0
    filters: ScrapeFilters | None = None
    articles: list[EnrichedArticle] = Field(default_factory=list)


class RecommendRequest(BaseModel):
    user_id: str
    categories: list[str] = Field(default_factory=list)
    country: str | None = None
    city: str | None = None
    language: str = "en"
    limit: int = 25
    exclude_ids: list[str] = Field(default_factory=list)


class RecommendResponse(BaseModel):
    news_ids: list[str] = Field(default_factory=list)
    scores: list[float] = Field(default_factory=list)
    model_version: str = "v1-category-recency"


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class DeepDiveRequest(BaseModel):
    heading: str
    paragraph: str
    full_content: str | None = None
    category: str | None = None
    source: str | None = None
    original_link: str | None = None
    city: str | None = None
    region: str | None = None
    country: str | None = None
    published_at: str | None = None
    entities: dict[str, list[str]] | None = None


class DeepDiveResponse(BaseModel):
    who: str
    what: str
    where: str
    when: str
    why: str
    how: str
