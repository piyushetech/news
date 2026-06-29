import axios from 'axios';
import { API_URL } from './config';
import { storage } from './storage';

const api = axios.create({ baseURL: API_URL, timeout: 20000 });

api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface DeepDive {
  who: string;
  what: string;
  where: string;
  when: string;
  why: string;
  how: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
}

export interface TrendingTopic {
  id: string;
  label: string;
  query: string;
  category: string;
  dynamic?: boolean;
}

export interface NewsItem {
  _id: string;
  heading: string;
  paragraph: string;
  fullContent?: string;
  category: string;
  source: string;
  originalLink?: string;
  imageUrl?: string;
  publishedAt: string;
  isTrending?: boolean;
  isControversial?: boolean;
  city?: string;
  region?: string;
  country?: string;
  language?: string;
  commentCount?: number;
  biasedCount?: number;
  eli5Summary?: string;
  deepDive?: DeepDive;
  biasLeft?: string;
  biasRight?: string;
}

export interface LanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  speechLocale: string;
}

export interface Comment {
  _id: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  subscribedCategories?: string[];
  notificationCategories?: string[];
  preferredLanguage?: string;
  countryCode?: string;
}

export interface UserPreferences {
  subscribedCategories?: string[];
  notificationCategories?: string[];
  preferredLanguage?: string;
  countryCode?: string;
}

export const authApi = {
  googleLogin: (idToken: string) =>
    api.post<{ data: { user: User; token: string } }>('/auth/google', { idToken }),
  getMe: () => api.get<{ data: User }>('/auth/me', {
    params: { _: Date.now() },
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  }),
  updatePreferences: (prefs: UserPreferences) =>
    api.patch<{ data: User }>('/auth/preferences', prefs, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    }),
  updateFcm: (fcmToken: string) => api.patch('/auth/fcm-token', { fcmToken }),
};

export const newsApi = {
  getCategories: () => api.get<{ data: Category[] }>('/news/categories'),
  getLanguages: () => api.get<{ data: LanguageOption[] }>('/news/languages'),
  getFeed: (page = 1, categories?: string[], lang?: string) =>
    api.get<{ data: NewsItem[]; pagination: { totalPages: number; page: number } }>('/news', {
      params: {
        page,
        limit: 10,
        ...(categories?.length ? { categories: categories.join(',') } : {}),
        ...(lang ? { lang } : {}),
      },
    }),
  getTrending: (lang?: string) =>
    api.get<{ data: NewsItem[] }>('/news/trending', { params: lang ? { lang } : {} }),
  getTrendingTopics: (country?: string, lang?: string, categories?: string[]) =>
    api.get<{ data: TrendingTopic[]; meta: { count: number; source: string } }>('/news/trending-topics', {
      params: {
        country,
        limit: 5,
        ...(lang ? { lang } : {}),
        ...(categories?.length ? { categories: categories.join(',') } : {}),
      },
    }),
  refreshTopic: (
    topic: string,
    country?: string,
    lang?: string,
    categories?: string[],
    extra?: { query?: string; label?: string },
  ) =>
    api.post<{
      data: NewsItem[];
      meta: { topic: string; label: string; count: number; hasMore: boolean; page: number };
      scrape: { created: number; approved: number };
    }>('/news/topic/refresh', {}, {
      params: {
        topic,
        country,
        page: 1,
        limit: 10,
        ...(lang ? { lang } : {}),
        ...(categories?.length ? { categories: categories.join(',') } : {}),
        ...(extra?.query ? { q: extra.query } : {}),
        ...(extra?.label ? { label: extra.label } : {}),
      },
      timeout: 120000,
    }),
  getTopicFeed: (
    topic: string,
    page = 1,
    country?: string,
    lang?: string,
    categories?: string[],
    extra?: { query?: string; label?: string },
  ) =>
    api.get<{
      data: NewsItem[];
      meta: { topic: string; label: string; hasMore: boolean; page: number; total: number };
    }>('/news/topic', {
      params: {
        topic,
        page,
        limit: 10,
        country,
        ...(lang ? { lang } : {}),
        ...(categories?.length ? { categories: categories.join(',') } : {}),
        ...(extra?.query ? { q: extra.query } : {}),
        ...(extra?.label ? { label: extra.label } : {}),
      },
    }),
  getLocal: (city?: string, country?: string, lang?: string) =>
    api.get<{ data: NewsItem[] }>('/news/local', { params: { city, country, ...(lang ? { lang } : {}) } }),
  refreshLocal: (city: string, country?: string, lang?: string) =>
    api.post<{
      data: NewsItem[];
      meta: { city: string; count: number; fallback?: boolean; scraped?: boolean };
      scrape?: { created?: number; approved?: number; feedsMatched?: number; engine?: string };
    }>('/news/local/refresh', {}, {
      params: { city, country, ...(lang ? { lang } : {}) },
      timeout: 120000,
    }),
  getCountry: (country = 'IN', lang?: string, page = 1, limit = 10) =>
    api.get<{ data: NewsItem[]; meta: { hasMore: boolean; page: number; total: number } }>(
      '/news/country',
      { params: { country, page, limit, ...(lang ? { lang } : {}) } },
    ),
  getBriefing: (country?: string, lang?: string) =>
    api.get<{ data: { stories: NewsItem[]; script: string } }>('/news/briefing', {
      params: { ...(country ? { country } : {}), ...(lang ? { lang } : {}) },
    }),
  getById: (id: string, lang?: string) =>
    api.get<{ data: NewsItem }>(`/news/${id}`, { params: lang ? { lang } : {} }),
  getDeepDive: (id: string, lang?: string) =>
    api.get<{ data: DeepDive }>(`/news/${id}/deep-dive`, { params: lang ? { lang } : {} }),
  getEli5: (id: string) => api.get<{ data: { eli5Summary: string } }>(`/news/${id}/eli5`),
  getBias: (id: string, lang?: string) =>
    api.get<{ data: { left: string; right: string; isControversial: boolean } }>(`/news/${id}/bias`, {
      params: lang ? { lang } : {},
    }),
  getComments: (id: string) => api.get<{ data: Comment[] }>(`/news/${id}/comments`),
  addComment: (id: string, text: string) =>
    api.post<{ data: Comment }>(`/news/${id}/comments`, { text }),
  getEngagement: (id: string) =>
    api.get<{ data: { commentCount: number; biasedCount: number; userMarked: boolean } }>(
      `/news/${id}/engagement`
    ),
  markBiased: (id: string, note?: string) =>
    api.post<{ data: { biasedCount: number; userMarked: boolean } }>(`/news/${id}/bias-feedback`, {
      type: 'biased',
      note,
    }),
  unmarkBiased: (id: string) =>
    api.delete<{ data: { biasedCount: number; userMarked: boolean } }>(`/news/${id}/bias-feedback`),
  getForMe: (opts?: {
    page?: number;
    limit?: number;
    category?: string;
    categories?: string[];
    lang?: string;
  }) =>
    api.get<{
      data: NewsItem[];
      meta: { count: number; hasMore: boolean; page: number; total: number; category?: string };
    }>('/news/for-me', {
      params: {
        page: opts?.page ?? 1,
        limit: opts?.limit ?? 10,
        ...(opts?.category ? { category: opts.category } : {}),
        ...(opts?.categories?.length ? { categories: opts.categories.join(',') } : {}),
        ...(opts?.lang ? { lang: opts.lang } : {}),
      },
    }),
  refreshForMe: (categories?: string[], category?: string) =>
    api.post<{
      data: NewsItem[];
      scrape: { created: number; skipped: number; approved?: number; feedsMatched: number; engine?: string };
      meta: { count: number; hasMore: boolean; page: number; category?: string };
    }>('/news/for-me/refresh', {}, {
      params: {
        page: 1,
        limit: 10,
        ...(category ? { category } : {}),
        ...(categories?.length ? { categories: categories.join(',') } : {}),
      },
      timeout: 120000,
    }),
};

export default api;
