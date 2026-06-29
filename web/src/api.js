import axios from 'axios';

const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const API = rawApi.endsWith('/api') ? rawApi : `${rawApi.replace(/\/$/, '')}/api`;
const PAGE_SIZE = 10;

export const api = axios.create({ baseURL: API, timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { PAGE_SIZE };

export const authApi = {
  googleLogin: (idToken) => api.post('/auth/google', { idToken }),
  getMe: () => api.get('/auth/me', {
    params: { _: Date.now() },
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  }),
  updatePreferences: (prefs) => api.patch('/auth/preferences', prefs, {
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  }),
};

const topicParams = (topic, country, lang, categories, extra = {}) => ({
  topic,
  country,
  lang,
  page: extra.page,
  limit: extra.limit,
  ...(categories?.length ? { categories: categories.join(',') } : {}),
  ...(extra.query ? { q: extra.query } : {}),
  ...(extra.label ? { label: extra.label } : {}),
});

export const newsApi = {
  getCategories: () => api.get('/news/categories'),
  getLanguages: () => api.get('/news/languages'),
  getTrendingTopics: (country, lang, categories) =>
    api.get('/news/trending-topics', {
      params: {
        country,
        limit: 5,
        lang,
        ...(categories?.length ? { categories: categories.join(',') } : {}),
      },
    }),
  getForMe: ({ page = 1, categories, lang }) =>
    api.get('/news/for-me', {
      params: {
        page,
        limit: PAGE_SIZE,
        lang,
        ...(categories?.length ? { categories: categories.join(',') } : {}),
      },
    }),
  refreshForMe: (categories) =>
    api.post('/news/for-me/refresh', {}, {
      params: {
        page: 1,
        limit: PAGE_SIZE,
        ...(categories?.length ? { categories: categories.join(',') } : {}),
      },
      timeout: 120000,
    }),
  getCountry: (country, lang, page = 1) =>
    api.get('/news/country', { params: { country, lang, page, limit: PAGE_SIZE } }),
  getTopicFeed: (topic, page, country, lang, categories, extra = {}) =>
    api.get('/news/topic', {
      params: topicParams(topic, country, lang, categories, { page, limit: PAGE_SIZE, ...extra }),
    }),
  refreshTopic: (topic, country, lang, categories, extra = {}) =>
    api.post('/news/topic/refresh', {}, {
      params: topicParams(topic, country, lang, categories, { page: 1, limit: PAGE_SIZE, ...extra }),
      timeout: 120000,
    }),
  getById: (id, lang) => api.get(`/news/${id}`, { params: lang ? { lang } : {} }),
  getComments: (id) => api.get(`/news/${id}/comments`),
  addComment: (id, text) => api.post(`/news/${id}/comments`, { text }),
  getEngagement: (id) => api.get(`/news/${id}/engagement`),
  markBiased: (id) => api.post(`/news/${id}/bias-feedback`, { type: 'biased' }),
  unmarkBiased: (id) => api.delete(`/news/${id}/bias-feedback`),
  getEli5: (id) => api.get(`/news/${id}/eli5`),
  getDeepDive: (id, lang) => api.get(`/news/${id}/deep-dive`, { params: lang ? { lang } : {} }),
  getBias: (id, lang) => api.get(`/news/${id}/bias`, { params: lang ? { lang } : {} }),
  getBriefing: (country, lang) =>
    api.get('/news/briefing', {
      params: {
        ...(country ? { country } : {}),
        ...(lang ? { lang } : {}),
      },
    }),
};
