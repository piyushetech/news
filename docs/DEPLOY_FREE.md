# Deploy BriefNews for free

Host the **Node API**, **Python service**, **web app**, and **admin panel** on free tiers. Estimated cost: **$0/month** (with cold starts and usage limits).

## Recommended stack (all free tier)

| Component | Service | Free tier notes |
|-----------|---------|-----------------|
| Database | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) M0 | 512 MB, shared cluster |
| Node API | [Render](https://render.com) Web Service | Spins down after ~15 min idle |
| Python API | Render Web Service | Same; uses slim `requirements-deploy.txt` |
| Web + Admin | Render Static Sites | Built from Vite `dist/` |

---

## Step 1 — MongoDB Atlas (free)

1. Create a free **M0** cluster (nearest region).
2. **Database Access** → add user with password.
3. **Network Access** → **Allow access from anywhere** (`0.0.0.0/0`) for Render.
4. Copy connection string, e.g.  
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/briefnews?retryWrites=true&w=majority`

---

## Step 2 — Push code to GitHub

Render deploys from Git. Render deploys from this repo root (`piyushetech/news`). No monorepo subfolder needed.

---

## Step 3 — Deploy with Render Blueprint

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect the GitHub repo.
3. Render detects `render.yaml`.
4. Set **sync: false** variables when prompted:

| Variable | Services | Notes |
|----------|----------|-------|
| `MONGODB_URI` | API + Python | Atlas connection string |
| `GOOGLE_CLIENT_ID` | API | Google OAuth Web client ID |
| `VITE_GOOGLE_CLIENT_ID` | Web | Same client ID |
| `ALLOWED_ORIGINS` | API | Optional extra CORS origins |

5. Click **Apply** — creates `briefnews-api`, `briefnews-python`, `briefnews-web`, `briefnews-admin`.

6. After API is live, open API **Shell**:

```bash
node src/seedAdmin.js
```

Admin email defaults to `admin@briefnews.app`; password is in Render **Environment** (`ADMIN_PASSWORD`).

---

## Step 4 — Google Sign-In (web)

1. Google Cloud Console → OAuth **Web application**.
2. **Authorized JavaScript origins**: your Render web URL (e.g. `https://briefnews-web.onrender.com`).
3. Set `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`, then redeploy web.

---

## Step 5 — Mobile (Expo)

In `mobile/app.json`:

```json
"apiUrl": "https://briefnews-api.onrender.com/api"
```

---

## Verify

```bash
curl https://YOUR-API.onrender.com/api/health
curl https://YOUR-PYTHON.onrender.com/health
```

---

## Free tier limits

- Render free services **sleep** when idle (~50 s cold start).
- Python uses **slim deps** (no Celery/Redis/spaCy) — scraping runs in-process.
- Atlas M0 has connection limits — fine for demos.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error | Check `WEB_URL` / `ADMIN_URL` on API; add origin to `ALLOWED_ORIGINS` |
| Empty feed | Run seed; approve stories in admin |
| Python build fails | Uses `requirements-deploy.txt` (not full `requirements.txt`). If pip errors on `motor`/`pymongo`, ensure `motor>=3.7` with `pymongo>=4.10`. |
| Blueprint partially failed | Delete failed services in Render → re-apply blueprint from latest `main` |
| Google login fails | Match client ID and authorized origins |
