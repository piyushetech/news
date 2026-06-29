# BriefNews Platform Architecture

> AI-powered news aggregator — legal-first design (headline + AI summary + source link, never full republishing).

## 1. Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Legal compliance** | Prefer RSS/API; store metadata + 60-word summary only; link out for full article |
| **Modular sources** | Plugin registry: add RSS/API/scraper without touching core |
| **Polyglot services** | Node.js = API/auth/realtime; Python = scrape/AI/ML |
| **Event-driven** | RabbitMQ between ingest → enrich → publish |
| **Cache-first reads** | Redis for feeds, Elasticsearch for search |
| **Human-in-the-loop** | Admin approval before mobile publish (current flow preserved) |

## 2. High-Level Architecture

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Mobile App  │  │ Admin Panel │  │ Web (future)│
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │ HTTPS / WSS
              ┌─────────▼─────────┐
              │   API Gateway     │  (AWS ALB / Nginx)
              │   Rate Limit CDN  │
              └─────────┬─────────┘
                        │
       ┌────────────────┼────────────────┐
       │                │                │
┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
│ Node.js API │  │ Socket.io   │  │ FastAPI     │
│ Express     │  │ Realtime    │  │ Python AI   │
│ Auth JWT    │  │ Breaking    │  │ Scrape ML   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
┌───▼───┐        ┌──────▼──────┐     ┌──────▼──────┐
│MongoDB│        │   Redis     │     │Elasticsearch│
│Primary│        │ Cache/Queue │     │ Search      │
└───────┘        └──────┬──────┘     └─────────────┘
                        │
                 ┌──────▼──────┐
                 │  RabbitMQ   │
                 │  Celery     │
                 └──────┬──────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
  ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
  │ RSS Worker  │ │ Scrape    │ │ AI Worker   │
  │ Feedparser  │ │ Playwright│ │ HF/OpenAI   │
  └─────────────┘ └───────────┘ └─────────────┘
```

## 3. Node.js ↔ Python Integration

### Option A — REST (MVP, current scaffold)

```
Admin/Mobile → Node.js → HTTP → FastAPI /internal/*
```

- Node calls Python for: `POST /internal/scrape`, `POST /internal/enrich`, `POST /internal/recommend`
- Shared secret header `X-Internal-Key`
- Timeout 120s for scrape jobs; async for long jobs (Option B)

### Option B — Message Queue (Production)

```
Node.js ──publish──► RabbitMQ ──consume──► Celery Workers (Python)
                │
                └──► Node subscribes to `article.enriched` → saves MongoDB
```

| Queue | Producer | Consumer | Payload |
|-------|----------|----------|---------|
| `scrape.jobs` | Node Admin | Python Celery | `{sourceId, filters}` |
| `article.raw` | Python | Python AI | `{title, url, excerpt}` |
| `article.enriched` | Python AI | Node worker | `{news document}` |
| `notify.send` | Node | Node FCM | `{userIds, category}` |

### Option C — Kafka (10M+ users)

- Partition by `category` + `country`
- Exactly-once ingest with idempotent `originalLink` dedup

## 4. Folder Structure

```
inshort/
├── backend/                 # Node.js API (existing)
│   └── src/
│       ├── services/
│       │   └── pythonBridge.js
│       └── workers/           # future: queue consumers
├── python-service/          # FastAPI + Celery
│   ├── app/
│   │   ├── main.py
│   │   ├── api/routes/
│   │   ├── scrapers/
│   │   ├── ai/
│   │   ├── models/
│   │   └── core/
│   ├── workers/
│   ├── tests/
│   └── requirements.txt
├── mobile/                  # Expo (existing)
├── admin/                   # Vite admin (existing)
├── infra/
│   ├── docker-compose.yml
│   ├── prometheus/
│   └── k8s/
├── shared/schemas/          # JSON Schema / OpenAPI fragments
└── docs/
```

## 5. MongoDB Schemas

See `shared/schemas/mongodb.md` and `python-service/app/models/schemas.py`.

Core collections:

- **users** — auth, preferences, notificationCategories, embeddings vector ref
- **news** — headline, paragraph (≤60 words), fullContent (≤300 for detail), originalLink, AI metadata
- **sources** — RSS URL, robots policy, rate limit, enabled, lastScrapedAt
- **reading_history** — userId, newsId, dwellMs, scrollDepth, skipped
- **recommendations** — userId, newsId, score, modelVersion
- **search_queries** — query, userId, resultsClicked
- **analytics_events** — event type, payload, sessionId
- **scraper_jobs** — status, filters, errors, feedsMatched

**Never store:** full publisher article text unless licensed.

## 6. ML Model Recommendations

| Use Case | Model | Why |
|----------|-------|-----|
| Recommendation | Two-tower + LightFM / implicit ALS | Cold-start with categories |
| Ranking | Learning-to-rank (XGBoost/LambdaMART) | Features: CTR, dwell, recency |
| Topic classification | `facebook/bart-large-mnli` or fine-tuned DistilBERT | Zero-shot categories |
| Duplicate detection | Sentence-BERT embeddings + cosine > 0.92 | Near-duplicate headlines |
| Sentiment | `cardiffnlp/twitter-roberta-base-sentiment` | Fast, good enough |
| NER | spaCy `en_core_web_trf` | People, orgs, locations |
| Fake news risk | Ensemble: source trust + sensationalism + cross-source | No single model is enough |
| Trending | EWMA on views + velocity + breaking score | Real-time friendly |
| Translation | MarianMT / Google API / OpenAI | Already in Node layer |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` | Semantic search |
| Vector DB | Qdrant / Pinecone / MongoDB Atlas Vector | RAG + dedup |

## 7. AI Pipeline (Python)

```
Raw Article → Normalize → Dedup (embedding) → Enrich:
  ├── Summarize (≤60 words)
  ├── Classify topic
  ├── NER entities
  ├── Sentiment + bias hint
  ├── Quality score
  ├── Translate (optional)
  └── Index Elasticsearch + store embedding
→ status: pending → Admin approve → publish
```

## 8. Search Architecture

```
User query → Redis autocomplete cache
          → Spell correct (SymSpell)
          → Elasticsearch multi-match + semantic kNN (embedding)
          → Filters: date, country, lang, category, sentiment
          → Rank: BM25 + personalization boost
```

## 9. Personalization Feeds

| Feed | Logic |
|------|-------|
| **For You** | subscribedCategories + ranking model + recency |
| **Recommended** | Collaborative filtering + content similarity |
| **Trending** | velocity score last 6h |
| **Local** | geo + city tags + language |
| **Breaking** | breakingScore > threshold + push |
| **Hidden topics** | negative signals (skip, dislike, hide) |

Signals stored in `reading_history` and `analytics_events`.

## 10. Security

- JWT access + refresh rotation
- OAuth: Google (live), Apple/Facebook (roadmap)
- Internal service auth: mTLS or shared secret + IP allowlist
- Rate limits: 200 req/15min public; 20 scrape triggers/hour/admin
- Helmet, CORS, input sanitization, NoSQL injection guards
- Scrapers: respect robots.txt, User-Agent identification, per-domain rate limits
- Audit logs for admin actions
- Secrets in AWS Secrets Manager / K8s secrets

## 11. Performance & Scale

| Layer | Tactic |
|-------|--------|
| Read API | Redis cache feed pages 60s TTL |
| Images | CloudFront + WebP resize |
| DB | Compound indexes on status+category+publishedAt |
| Search | ES replicas, dedicated cluster |
| Workers | Horizontal Celery pods, priority queues |
| 10M users | Shard Mongo by userId region; read replicas |

## 12. Monitoring

- **Prometheus**: request latency, queue depth, scrape success rate
- **Grafana**: DAU, notification CTR, scraper health
- **ELK/OpenSearch**: structured logs from Node + Python
- **Sentry**: error tracking
- **PagerDuty**: scraper failure > 30% for 15min

## 13. CI/CD

```
PR → lint + unit tests → integration (docker-compose) → build images → push ECR
main → deploy staging → smoke tests → deploy prod (K8s rolling)
```

## 14. Legal News Sources (Preferred)

Use official RSS/API only. Examples already in `backend/src/constants/rssFeeds.js`:

- BBC, Guardian, Al Jazeera, Reuters (where available)
- NPR, TechCrunch, Ars Technica, CoinDesk, NASA, WHO, UN
- Indian: Times of India RSS, The Hindu, BBC regional languages

**NewsAPI.org** — use with license key for development; check redistribution terms.

**Google News RSS** — topic feeds for discovery; always link to publisher.

## 15. Roadmap

### Phase 1 — MVP (Now → 3 months)
- [x] Node RSS scrape + admin approve + mobile
- [ ] Python FastAPI RSS ingest (parallel path)
- [ ] Redis cache
- [ ] Category notifications
- [ ] Reading history events

### Phase 2 — AI Core (3–6 months)
- [ ] Python enrichment pipeline (summary, sentiment, NER)
- [ ] Elasticsearch search
- [ ] Recommendation v1 (category + behavior)
- [ ] Duplicate detection

### Phase 3 — Scale (6–12 months)
- [ ] RabbitMQ + Celery distributed crawl
- [ ] Playwright pool for dynamic sites (robots-compliant)
- [ ] Vector search + RAG chatbot
- [ ] Analytics dashboard

### Phase 4 — 10M+ users (12–24 months)
- [ ] Kafka ingest
- [ ] Multi-region K8s
- [ ] ML ranking A/B platform
- [ ] Ad/revenue analytics

## 16. API Documentation

- Node: OpenAPI at `/api/docs` (future swagger-jsdoc)
- Python: FastAPI auto OpenAPI at `/docs` and `/redoc`
