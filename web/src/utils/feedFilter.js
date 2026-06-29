export const FEED_FILTER_PREFS_KEY = 'feedFilterFromPrefs';

/** Stable key for toggle select/deselect on the same chip. */
export function topicToggleKey(topic) {
  if (!topic) return '';
  const id = (topic.id || '').trim().toLowerCase();
  if (id) return id;
  const query = (topic.query || '').trim().toLowerCase();
  if (query) return query;
  return (topic.label || '').trim().toLowerCase();
}

/** True if this chip is the currently active trending topic. */
export function isActiveTopicChip(activeTopic, topic, feedMode = 'latest') {
  if (feedMode !== 'topic' || !activeTopic || !topic) return false;
  return topicToggleKey(activeTopic) === topicToggleKey(topic) || isSameTopic(activeTopic, topic);
}

/** After prefs save: show All + one chip per topic (2+). Single topic → no filter row. */
export function filterStateFromSubscribed(categories) {
  return { filterAll: true, selectedCategories: [] };
}

/** Match trending topic chips to the active selection (ids can shift after refresh). */
export function isSameTopic(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  const qA = (a.query || '').trim().toLowerCase();
  const qB = (b.query || '').trim().toLowerCase();
  if (qA && qB && qA === qB) return true;
  const lA = (a.label || '').trim().toLowerCase();
  const lB = (b.label || '').trim().toLowerCase();
  if (lA && lB && lA === lB) return true;
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (lA && lB && slug(lA) === slug(lB)) return true;
  return false;
}

/** Single-select among subscribed categories only. */
export function nextCategoryFilterState({ filterAll, selectedCategories }, categoryId, subscribed = []) {
  if (categoryId === 'all') {
    return { filterAll: true, selectedCategories: [] };
  }
  if (!subscribed.includes(categoryId)) {
    return { filterAll, selectedCategories };
  }
  if (!filterAll && selectedCategories.length === 1 && selectedCategories[0] === categoryId) {
    return { filterAll: true, selectedCategories: [] };
  }
  return { filterAll: false, selectedCategories: [categoryId] };
}

export function effectiveCategories(subscribed, filterAll, selectedCategories) {
  const list = (subscribed || []).filter(Boolean);
  if (!list.length) return [];
  if (filterAll || !selectedCategories.length) return list;
  const active = selectedCategories.filter((c) => list.includes(c));
  return active.length ? active : list;
}

/** Keep active trending topic visible; drop stale duplicates from the list. */
export function mergeTopicChips(trending, activeTopic) {
  let list = [...(trending || [])];
  if (activeTopic) {
    list = list.filter((t) => !isSameTopic(t, activeTopic));
    list.unshift(activeTopic);
  }
  return list;
}

export function storeFeedFilterFromPrefs(categories) {
  sessionStorage.setItem(FEED_FILTER_PREFS_KEY, JSON.stringify(categories));
}

export function consumeFeedFilterFromPrefs() {
  const raw = sessionStorage.getItem(FEED_FILTER_PREFS_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(FEED_FILTER_PREFS_KEY);
  try {
    return filterStateFromSubscribed(JSON.parse(raw));
  } catch {
    return null;
  }
}
