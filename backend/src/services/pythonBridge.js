/**
 * Node.js bridge — call Python FastAPI for scrape, enrich, recommend.
 * Set PYTHON_SERVICE_URL and PYTHON_INTERNAL_KEY in backend .env
 */

const PYTHON_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
const INTERNAL_KEY = process.env.PYTHON_INTERNAL_KEY || 'change-me-internal-key';
const TIMEOUT_MS = parseInt(process.env.PYTHON_TIMEOUT_MS || '120000', 10);

const pythonFetch = async (path, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${PYTHON_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': INTERNAL_KEY,
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.detail || data.message || `Python service error ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
};

const isPythonEnabled = () => process.env.PYTHON_SERVICE_ENABLED === 'true';

const scrapeViaPython = async (filters = {}) => {
  if (!isPythonEnabled()) return null;
  return pythonFetch('/internal/scrape', {
    method: 'POST',
    body: JSON.stringify(filters),
  });
};

const getPythonScrapeOptions = async () => {
  if (!isPythonEnabled()) return null;
  return pythonFetch('/internal/scrape/options', { method: 'GET' });
};

const recommendViaPython = async (payload) => {
  if (!isPythonEnabled()) return null;
  return pythonFetch('/internal/recommend', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

const enrichViaPython = async (articles) => {
  if (!isPythonEnabled()) return null;
  return pythonFetch('/internal/enrich', {
    method: 'POST',
    body: JSON.stringify(articles),
  });
};

const deepDiveViaPython = async (news) => {
  if (!isPythonEnabled()) return null;
  const payload = {
    heading: news.heading,
    paragraph: news.paragraph,
    full_content: news.fullContent || null,
    category: news.category || null,
    source: news.source || null,
    original_link: news.originalLink || null,
    city: news.city || null,
    region: news.region || null,
    country: news.country || null,
    published_at: news.publishedAt ? new Date(news.publishedAt).toISOString() : null,
    entities: news.entities || null,
  };
  return pythonFetch('/internal/deep-dive', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

const checkPythonHealth = async () => {
  try {
    const res = await fetch(`${PYTHON_URL}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
};

module.exports = {
  isPythonEnabled,
  scrapeViaPython,
  getPythonScrapeOptions,
  recommendViaPython,
  enrichViaPython,
  deepDiveViaPython,
  checkPythonHealth,
};
