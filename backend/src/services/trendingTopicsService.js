const { TRENDING_TOPICS } = require('../constants/trendingTopics');

const CACHE_MS = 60 * 60 * 1000;
const cache = new Map();

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'topic';

const stripSource = (title) =>
  title.replace(/\s*[-–|]\s*[^-|–]+$/, '').trim();

const shortenLabel = (title, max = 42) => {
  const clean = stripSource(title);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim()}…`;
};

const buildTopNewsUrl = (country = 'IN', lang = 'en') => {
  const hl = lang === 'hi' ? 'hi-IN' : `${lang}-${country}`;
  return `https://news.google.com/rss?hl=${hl}&gl=${country}&ceid=${country}:${lang}`;
};

const buildSearchUrl = (query, country = 'IN', lang = 'en') => {
  const hl = lang === 'hi' ? 'hi-IN' : `${lang}-${country}`;
  const params = new URLSearchParams({
    q: query,
    hl,
    gl: country,
    ceid: `${country}:${lang}`,
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
};

const CATEGORY_QUERIES = {
  Politics: 'India politics',
  Cricket: 'India cricket',
  History: 'India history',
  World: 'world news',
  Technology: 'technology news India',
  Business: 'business news India',
  Sports: 'sports news India',
  Science: 'science news India',
  Entertainment: 'entertainment news India',
  Crime: 'crime news India',
  National: 'India national news',
  City: 'India city news',
  General: 'India news',
};

const buildFeedUrl = (country = 'IN', lang = 'en', categories = []) => {
  if (categories.length === 1) {
    const q = CATEGORY_QUERIES[categories[0]] || `${categories[0]} news India`;
    return { url: buildSearchUrl(q, country, lang), scope: categories[0] };
  }
  if (categories.length > 1) {
    const q = categories
      .map((c) => CATEGORY_QUERIES[c] || `${c} news India`)
      .join(' OR ');
    return { url: buildSearchUrl(q, country, lang), scope: categories.join(',') };
  }
  return { url: buildTopNewsUrl(country, lang), scope: 'general' };
};

const parseHeadlines = (xml) => {
  const titles = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  blocks.forEach((block) => {
    const m = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!m?.[1]) return;
    const title = m[1]
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    if (title) titles.push(title);
  });
  return titles;
};

const titlesToTopics = (titles, limit = 5, category = 'General') => {
  const seen = new Set();
  const topics = [];

  for (const rawTitle of titles) {
    const label = shortenLabel(rawTitle);
    const query = stripSource(rawTitle).slice(0, 120);
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);

    const id = slugify(label);
    topics.push({
      id,
      label,
      query,
      category,
      dynamic: true,
    });
    if (topics.length >= limit) break;
  }

  return topics;
};

const cacheKey = (country, lang, categories = []) => {
  const cats = [...categories].sort().join(',') || 'all';
  return `${country}:${lang}:${cats}`;
};

const fetchDynamicTopics = async (country = 'IN', lang = 'en', limit = 5, categories = []) => {
  const key = cacheKey(country, lang, categories);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return { topics: hit.topics.slice(0, limit), source: 'cache' };
  }

  const primaryCategory = categories.length === 1 ? categories[0] : 'General';

  try {
    const { url } = buildFeedUrl(country, lang, categories);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BriefNews-NewsBot/1.0' },
    });
    if (!res.ok) throw new Error(`Trending feed ${res.status}`);
    const xml = await res.text();
    const headlines = parseHeadlines(xml);
    let topics = titlesToTopics(headlines, limit, primaryCategory);

    if (topics.length < limit) {
      const fallback = TRENDING_TOPICS.filter(
        (t) => !topics.some((d) => d.id === t.id),
      ).slice(0, limit - topics.length);
      topics = [...topics, ...fallback.map((t) => ({ ...t, dynamic: false, category: primaryCategory }))];
    }

    cache.set(key, { topics, at: Date.now() });
    let result = topics.slice(0, limit);
    if (categories.length === 1) {
      result = result.filter((t) => categories.includes(t.category));
    } else if (categories.length > 1) {
      result = result.filter((t) => categories.includes(t.category) || t.dynamic);
    }
    if (categories.length && result.length < limit) {
      const pool = categories.length === 1 ? categories : categories;
      const extras = TRENDING_TOPICS.filter(
        (t) => pool.includes(t.category) && !result.some((d) => d.id === t.id),
      ).slice(0, limit - result.length);
      result = [...result, ...extras.map((t) => ({ ...t, dynamic: false }))];
    }
    return { topics: result.slice(0, limit), source: 'live' };
  } catch {
    const topics = TRENDING_TOPICS.slice(0, limit).map((t) => ({
      ...t,
      dynamic: false,
      category: primaryCategory,
    }));
    cache.set(key, { topics, at: Date.now() });
    let result = topics;
    if (categories.length === 1) {
      result = result.filter((t) => categories.includes(t.category));
    } else if (categories.length > 1) {
      result = result.filter((t) => categories.includes(t.category));
    }
    return { topics: result.slice(0, limit), source: 'fallback' };
  }
};

const findCachedTopic = (topicId, country = 'IN', lang = 'en', categories = []) => {
  const primary = cache.get(cacheKey(country, lang, categories));
  if (primary?.topics) {
    const hit = primary.topics.find((t) => t.id === topicId);
    if (hit) return hit;
  }

  const prefix = `${country}:${lang}:`;
  for (const [key, value] of cache.entries()) {
    if (!key.startsWith(prefix) || !value?.topics) continue;
    const hit = value.topics.find((t) => t.id === topicId);
    if (hit) return hit;
  }

  return null;
};

const resolveTopic = (topicId, country = 'IN', lang = 'en', categories = []) => {
  const cached = findCachedTopic(topicId, country, lang, categories);
  if (cached) return cached;
  return TRENDING_TOPICS.find((t) => t.id === topicId) || null;
};

module.exports = {
  fetchDynamicTopics,
  resolveTopic,
  findCachedTopic,
};
