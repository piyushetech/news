export const FEED_FILTER_PREFS_KEY = 'feedFilterFromPrefs';

export function topicToggleKey(topic: { id?: string; label?: string; query?: string } | null | undefined) {
  if (!topic) return '';
  const id = (topic.id || '').trim().toLowerCase();
  if (id) return id;
  const query = (topic.query || '').trim().toLowerCase();
  if (query) return query;
  return (topic.label || '').trim().toLowerCase();
}

export function isActiveTopicChip(
  activeTopic: { id?: string; label?: string; query?: string } | null | undefined,
  topic: { id?: string; label?: string; query?: string } | null | undefined,
  feedMode: string = 'latest',
) {
  if (feedMode !== 'topic' || !activeTopic || !topic) return false;
  return topicToggleKey(activeTopic) === topicToggleKey(topic) || isSameTopic(activeTopic, topic);
}

export function filterStateFromSubscribed(_categories: string[]) {
  return { filterAll: true, selectedCategories: [] as string[] };
}

export function isSameTopic(
  a: { id?: string; label?: string; query?: string } | null | undefined,
  b: { id?: string; label?: string; query?: string } | null | undefined,
) {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  const qA = (a.query || '').trim().toLowerCase();
  const qB = (b.query || '').trim().toLowerCase();
  if (qA && qB && qA === qB) return true;
  const lA = (a.label || '').trim().toLowerCase();
  const lB = (b.label || '').trim().toLowerCase();
  if (lA && lB && lA === lB) return true;
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (lA && lB && slug(lA) === slug(lB)) return true;
  return false;
}

export function nextCategoryFilterState(
  current: { filterAll: boolean; selectedCategories: string[] },
  categoryId: string,
  subscribed: string[] = [],
) {
  if (categoryId === 'all') {
    return { filterAll: true, selectedCategories: [] as string[] };
  }
  if (!subscribed.includes(categoryId)) {
    return current;
  }
  if (!current.filterAll && current.selectedCategories.length === 1 && current.selectedCategories[0] === categoryId) {
    return { filterAll: true, selectedCategories: [] as string[] };
  }
  return { filterAll: false, selectedCategories: [categoryId] };
}

export function effectiveCategories(
  subscribed: string[],
  filterAll: boolean,
  selectedCategories: string[],
) {
  const list = (subscribed || []).filter(Boolean);
  if (!list.length) return [];
  if (filterAll || !selectedCategories.length) return list;
  const active = selectedCategories.filter((c) => list.includes(c));
  return active.length ? active : list;
}

export function mergeTopicChips<T extends { id: string; label: string; query?: string }>(
  trending: T[],
  activeTopic: T | null,
): T[] {
  let list = [...trending];
  if (activeTopic) {
    list = list.filter((t) => !isSameTopic(t, activeTopic));
    list.unshift(activeTopic);
  }
  return list;
}
