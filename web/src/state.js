import { getSpeechLocale as speechLocaleFor } from './constants/speechLocales.js';

const USER_STORAGE_KEY = 'briefnews_user';

export const state = {
  user: null,
  countryCode: 'IN',
  language: 'en',
};

export const setUser = (user) => {
  if (!user) {
    state.user = null;
    return;
  }
  state.user = {
    ...user,
    subscribedCategories: Array.isArray(user.subscribedCategories)
      ? [...user.subscribedCategories]
      : [],
    notificationCategories: Array.isArray(user.notificationCategories)
      ? [...user.notificationCategories]
      : [],
  };
  if (user.countryCode) state.countryCode = user.countryCode;
  if (user.preferredLanguage) state.language = user.preferredLanguage;
};

/** Save user to memory + sessionStorage (no /auth/me round-trip). */
export const persistUser = (user) => {
  if (!user) {
    state.user = null;
    sessionStorage.removeItem(USER_STORAGE_KEY);
    return;
  }
  const snapshot = {
    ...user,
    subscribedCategories: Array.isArray(user.subscribedCategories)
      ? [...user.subscribedCategories]
      : [],
    notificationCategories: Array.isArray(user.notificationCategories)
      ? [...user.notificationCategories]
      : [],
  };
  setUser(snapshot);
  sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(snapshot));
};

export const hydrateUserFromStorage = () => {
  if (state.user) return true;
  const raw = sessionStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return false;
  try {
    setUser(JSON.parse(raw));
    return true;
  } catch {
    sessionStorage.removeItem(USER_STORAGE_KEY);
    return false;
  }
};

export const getSubscribed = () => state.user?.subscribedCategories || [];

export const needsPreferences = () => {
  const cats = getSubscribed();
  return !cats.length;
};

export const getSpeechLocale = () => speechLocaleFor(state.language);
