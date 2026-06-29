# BriefNews

InShorts-style AI news app — **headline + 60-word crux + original link**. Admin approves automated stories before they go live on mobile.

## Stack

```
inshort/
├── backend/         # Node.js API + JWT + MongoDB (port 5001)
├── python-service/  # FastAPI scraping + AI enrichment (port 8000)
├── admin/           # BriefNews admin — approve/reject (port 5174)
├── web/             # BriefNews web app — same as mobile (port 5175)
├── mobile/          # Expo React Native app
├── infra/           # Docker Compose (Mongo, Redis, RabbitMQ, services)
└── docs/            # Platform architecture
```

See **[docs/PLATFORM_ARCHITECTURE.md](docs/PLATFORM_ARCHITECTURE.md)** for the full system design, ML models, roadmap to 10M+ users, and Node↔Python integration.

## Quick Start

### Backend
```bash
cd inshort/backend
cp .env.example .env
npm install
npm run seed          # Admin + sample approved stories
npm run dev           # http://localhost:5001
```

### Python Service (optional, recommended)
```bash
cd inshort/python-service
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Set `PYTHON_SERVICE_ENABLED=true` in `backend/.env` to route Admin Auto Fetch through Python.

### Docker (full stack)
```bash
cd inshort/infra
docker compose up --build
```

### Free cloud deploy (Render + MongoDB Atlas)
See **[docs/DEPLOY_FREE.md](docs/DEPLOY_FREE.md)** for step-by-step $0 deployment of Node API, Python service, web, and admin.

**Admin:** `admin@inshort.com` / `Admin@123456`

Optional: set `OPENAI_API_KEY` in backend or python `.env` for smarter summaries and AI features.

### Admin
```bash
cd inshort/admin
npm install
npm run dev           # http://localhost:5174
```

### Web app (same experience as mobile)
```bash
cd inshort/web
cp .env.example .env
npm install
npm run dev           # http://localhost:5175
```

Sign in with Google (or **Continue as Dev User** in development). Pick topics, browse latest news, filter by category, and open stories — same API as the mobile app.

1. **Auto Fetch** — scrapes RSS feeds → creates **pending** stories
2. **Pending** tab — review headline, 60-word crux, original link → **Approve** or **Reject**
3. Only **approved** stories appear in the mobile app

### Mobile
```bash
cd inshort/mobile
npm install
npx expo start
```

## Mobile Features

| Feature | Description |
|---------|-------------|
| 🎧 Morning Briefing | Plays top 5 trending stories via text-to-speech |
| 🔊 Listen | Read any card aloud (expo-speech) |
| 🔍 Deep Dive | 5W1H explainer (Who, What, Where, When, Why, How) |
| 🧠 ELI5 | Simplify story like explaining to a 5-year-old |
| ⚖️ Bias Meter | Left vs Right perspectives on political news |
| 🌍 My Neighborhood | Location-based local/city news tab |
| 🔗 Original Link | Open source article |

## API Highlights

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/news` | Approved feed only |
| GET | `/api/news/trending` | Top 5 for briefing |
| GET | `/api/news/local?city=` | Neighborhood news |
| GET | `/api/news/:id/deep-dive` | 5W1H breakdown |
| GET | `/api/news/:id/eli5` | ELI5 summary |
| GET | `/api/news/:id/bias` | Left/Right perspectives |
| POST | `/api/admin/news/scrape` | Fetch RSS news |
| PATCH | `/api/admin/news/:id/approve` | Publish to mobile |
| PATCH | `/api/admin/news/:id/reject` | Hide from mobile |
