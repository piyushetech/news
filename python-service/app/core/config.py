from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "BriefNews Python Service"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    internal_api_key: str = "change-me-internal-key"
    mongodb_uri: str = "mongodb://localhost:27017/inshort"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    scrape_user_agent: str = "BriefNews-NewsBot/2.0 (+https://briefnews.app/bot)"
    scrape_max_items_per_feed: int = 3
    scrape_timeout_seconds: int = 30
    respect_robots_txt: bool = True

    duplicate_similarity_threshold: float = 0.92
    summary_max_words: int = 60


settings = Settings()
