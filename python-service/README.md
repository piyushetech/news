# BriefNews Python Service

FastAPI microservice for **legal RSS ingestion**, **AI enrichment**, and **recommendations**.

## Quick Start (Windows)

```powershell
cd python-service

# One-time setup
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-core.txt

# Run (use python -m — uvicorn alone may not be on PATH)
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Or double-click / run: `.\run.ps1`

## Quick Start (macOS/Linux)

```bash
cd python-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-core.txt
python -m uvicorn app.main:app --reload --port 8000
```

Open **http://localhost:8000/docs** for OpenAPI Swagger UI.

## Enable from Node.js

In `backend/.env`:

```env
PYTHON_SERVICE_ENABLED=true
PYTHON_SERVICE_URL=http://localhost:8000
PYTHON_INTERNAL_KEY=change-me-internal-key
```

Admin **Auto Fetch** will use Python when enabled (falls back to Node RSS scraper).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health |
| GET | `/metrics` | Prometheus metrics |
| POST | `/internal/scrape` | Filtered RSS scrape + AI enrich |
| GET | `/internal/scrape/options` | Categories, cities, languages |
| POST | `/internal/recommend` | Personalized ranking v1 |
| POST | `/internal/enrich` | Enrich raw articles from Node |

All `/internal/*` routes require header: `X-Internal-Key: <INTERNAL_API_KEY>`.

## Celery Worker

```bash
celery -A workers.celery_app worker -Q scrape,ai -l info
```

## Docker

```bash
docker compose -f ../infra/docker-compose.yml up --build
```

## Legal Notice

- Only official RSS feeds and permitted APIs
- Store headline + AI summary + link — **never full article republishing**
- Respects `robots.txt` when `RESPECT_ROBOTS_TXT=true`
- Admin approval required before mobile publish

## Tests

```bash
pytest tests/ -q
```

## Optional Models

```bash
python -m spacy download en_core_web_sm
```

Sentence-transformers downloads on first enrichment run.
