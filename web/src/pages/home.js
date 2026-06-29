import { newsApi } from '../api.js';
import { state, getSubscribed, getSpeechLocale } from '../state.js';
import { escapeHtml, navigate } from '../router.js';
import { t } from '../i18n.js';
import { speakNewsCard, speakBriefing, stopSpeaking } from '../tts.js';
import { isBriefingEnabled } from './briefing.js';
import { renderNewsCard, bindNewsCards } from '../components/newsCard.js';
import { renderEmptyPanel } from '../components/emptyPanel.js';
import { logout } from './login.js';
import { clearPreferencesSession } from './preferences.js';
import { consumeFeedFilterFromPrefs, isActiveTopicChip, mergeTopicChips, nextCategoryFilterState } from '../utils/feedFilter.js';

let rootEl = null;
let observer = null;
let pullStartY = 0;
let pulling = false;
let topicRequestGen = 0;

const feedState = {
  items: [],
  page: 1,
  hasMore: false,
  loading: false,
  refreshing: false,
  feedMode: 'latest',
  activeTopic: null,
  filterAll: true,
  selectedCategories: [],
  trendingTopics: [],
  loadingTopics: true,
  briefingPlaying: false,
  speakingId: null,
  expandedIds: new Set(),
  fetchingTopicId: null,
};

function effectiveCategories() {
  const subscribed = getSubscribed();
  if (feedState.filterAll || !feedState.selectedCategories.length) return subscribed;
  const active = feedState.selectedCategories.filter((c) => subscribed.includes(c));
  return active.length ? active : subscribed;
}

function syncFilterWithSubscribed() {
  const subscribed = getSubscribed();
  feedState.selectedCategories = feedState.selectedCategories.filter((c) => subscribed.includes(c));
  if (!feedState.selectedCategories.length) feedState.filterAll = true;
}

function reloadFeedForFilterChange({ refresh = true } = {}) {
  syncFilterWithSubscribed();
  stopSpeaking();
  feedState.speakingId = null;
  feedState.loading = true;
  paint();

  (async () => {
    await loadTrendingTopics();
    try {
      if (feedState.feedMode === 'topic' && feedState.activeTopic) {
        await selectTopic(feedState.activeTopic);
      } else if (getSubscribed().length && refresh) {
        await newsApi.refreshForMe(effectiveCategories());
        await loadFeed(1, true);
      } else {
        await loadFeed(1, true);
      }
    } catch {
      await loadFeed(1, true);
    }
  })();
}

function feedLabel() {
  if (feedState.feedMode === 'topic' && feedState.activeTopic) {
    return feedState.activeTopic.label;
  }
  if (!feedState.filterAll && feedState.selectedCategories.length === 1) {
    return `${t('latestIn')} ${feedState.selectedCategories[0]}`;
  }
  if (!feedState.filterAll && feedState.selectedCategories.length > 1) {
    return `${t('latestIn')} ${feedState.selectedCategories.join(', ')}`;
  }
  const subscribed = getSubscribed();
  if (subscribed.length === 1) return `${t('latestIn')} ${subscribed[0]}`;
  return `${t('latestIn')} ${state.countryCode === 'IN' ? 'India' : state.countryCode}`;
}

async function fetchPage(pageNum) {
  const cats = effectiveCategories();
  const { language: lang, countryCode: country } = state;

  if (feedState.feedMode === 'topic' && feedState.activeTopic) {
    const res = await newsApi.getTopicFeed(
      feedState.activeTopic.id,
      pageNum,
      country,
      lang,
      cats,
      { query: feedState.activeTopic.query, label: feedState.activeTopic.label },
    );
    return { items: res.data.data, hasMore: res.data.meta.hasMore };
  }

  if (cats.length) {
    const res = await newsApi.getForMe({ page: pageNum, categories: cats, lang });
    return { items: res.data.data, hasMore: res.data.meta.hasMore };
  }

  const res = await newsApi.getCountry(country, lang, pageNum);
  return { items: res.data.data, hasMore: res.data.meta.hasMore };
}

async function loadFeed(pageNum = 1, replace = true) {
  if (feedState.loading && !replace) return;
  feedState.loading = true;
  paint();

  try {
    const { items, hasMore } = await fetchPage(pageNum);
    feedState.items = replace ? items : [...feedState.items, ...items];
    feedState.page = pageNum;
    feedState.hasMore = hasMore;
  } catch {
    if (replace) feedState.items = [];
    feedState.hasMore = false;
  } finally {
    feedState.loading = false;
    feedState.refreshing = false;
    paint();
    setupInfiniteScroll();
    setupPullRefresh();
  }
}

async function loadTrendingTopics() {
  feedState.loadingTopics = true;
  paint();
  try {
    const res = await newsApi.getTrendingTopics(state.countryCode, state.language, effectiveCategories());
    feedState.trendingTopics = (res.data.data || []).slice(0, 5);
  } catch {
    feedState.trendingTopics = [];
  } finally {
    feedState.loadingTopics = false;
    paint();
  }
}

async function refreshFeed() {
  if (feedState.refreshing) return;
  feedState.refreshing = true;
  paint();
  try {
    if (feedState.feedMode === 'topic' && feedState.activeTopic) {
      await newsApi.refreshTopic(
        feedState.activeTopic.id,
        state.countryCode,
        state.language,
        effectiveCategories(),
        { query: feedState.activeTopic.query, label: feedState.activeTopic.label },
      );
    } else if (getSubscribed().length) {
      await newsApi.refreshForMe(effectiveCategories());
    }
  } catch { /* ignore */ }
  await loadFeed(1, true);
}

async function selectTopic(topic) {
  const reqId = ++topicRequestGen;
  stopSpeaking();
  feedState.speakingId = null;
  feedState.feedMode = 'topic';
  feedState.activeTopic = {
    id: topic.id,
    label: topic.label,
    query: topic.query || topic.label,
  };
  feedState.page = 1;
  feedState.hasMore = false;
  feedState.loading = true;
  feedState.fetchingTopicId = topic.id;
  paint();

  const topicExtra = { query: feedState.activeTopic.query, label: feedState.activeTopic.label };

  try {
    let res = await newsApi.getTopicFeed(
      topic.id,
      1,
      state.countryCode,
      state.language,
      effectiveCategories(),
      topicExtra,
    );
    if (reqId !== topicRequestGen) return;
    if (!res.data.data.length) {
      res = await newsApi.refreshTopic(
        topic.id,
        state.countryCode,
        state.language,
        effectiveCategories(),
        topicExtra,
      );
    }
    if (reqId !== topicRequestGen) return;
    feedState.items = res.data.data;
    feedState.hasMore = res.data.meta.hasMore;
    feedState.page = 1;
    if (res.data.meta.label) {
      feedState.activeTopic.label = res.data.meta.label;
    }
    if (!res.data.data.length) {
      alert(`BriefNews: ${t('pullToFetchTopic')}`);
    }
  } catch {
    if (reqId !== topicRequestGen) return;
    feedState.items = [];
    feedState.hasMore = false;
  } finally {
    if (reqId !== topicRequestGen) return;
    feedState.loading = false;
    feedState.fetchingTopicId = null;
    paint();
    setupInfiniteScroll();
  }
}

function resetToLatest() {
  topicRequestGen += 1;
  stopSpeaking();
  feedState.speakingId = null;
  feedState.feedMode = 'latest';
  feedState.activeTopic = null;
  feedState.fetchingTopicId = null;
  loadFeed(1, true);
}

function onTopicPress(topic, wasActive = false) {
  const togglingOff = feedState.feedMode === 'topic' && (
    wasActive
    || isActiveTopicChip(feedState.activeTopic, topic, feedState.feedMode)
  );
  if (togglingOff) {
    resetToLatest();
    return;
  }
  selectTopic(topic);
}

async function playMorningBriefing() {
  if (!isBriefingEnabled()) return;
  if (feedState.briefingPlaying) {
    stopSpeaking();
    feedState.briefingPlaying = false;
    paint();
    return;
  }
  try {
    const res = await newsApi.getBriefing(state.countryCode, state.language);
    const stories = res.data.data.stories;
    if (!stories.length) {
      alert('BriefNews: No stories for briefing yet.');
      return;
    }
    feedState.briefingPlaying = true;
    paint();
    speakBriefing(stories, () => {
      feedState.briefingPlaying = false;
      paint();
    }, getSpeechLocale(), state.language);
  } catch {
    alert('Could not load morning briefing.');
  }
}

function paint() {
  if (!rootEl) return;
  if (!isBriefingEnabled() && feedState.briefingPlaying) {
    stopSpeaking();
    feedState.briefingPlaying = false;
  }
  const subscribed = getSubscribed();
  const countryLabel = state.countryCode === 'IN' ? 'India' : state.countryCode;
  const userInitial = state.user?.name?.charAt(0) || 'N';

  rootEl.innerHTML = `
    <div class="layout">
      <div class="pull-indicator ${feedState.refreshing ? 'visible' : ''}" id="pull-indicator">
        ${feedState.refreshing ? 'Refreshing…' : '↓ Pull to refresh'}
      </div>
      <header class="site-header">
        <div class="header-row">
          <div class="brand">
            ${state.user?.avatar
              ? `<img class="avatar" src="${escapeHtml(state.user.avatar)}" alt="" />`
              : `<div class="avatar avatar-letter">${escapeHtml(userInitial)}</div>`}
            <div>
              <strong>BriefNews</strong>
              <span>${subscribed.length ? `${subscribed.length} ${t('topicsSelected')}` : t('newsInWords')}</span>
            </div>
          </div>
          <div class="header-actions">
            <button type="button" class="icon-btn" id="prefs-btn" title="Preferences">⚙</button>
            <button type="button" class="icon-btn" id="logout-btn" title="Logout">⎋</button>
          </div>
        </div>

        <div class="header-tabs">
          <button type="button" class="tab-btn ${feedState.feedMode === 'latest' ? 'active' : ''}" id="tab-latest">⚡ ${t('latest')}</button>
          <span class="country-badge">🌐 ${countryLabel}</span>
        </div>

        ${subscribed.length > 1 ? `
          <p class="filter-label">${t('filterTopics')}</p>
          <div class="chip-scroll">
            <button type="button" class="chip ${feedState.filterAll ? 'active' : ''}" data-filter="all">${t('all')}</button>
            ${subscribed.map((c) => {
              const catActive = !feedState.filterAll && feedState.selectedCategories.includes(c);
              return `
              <button type="button" class="chip ${catActive ? 'active' : ''}" data-filter="${escapeHtml(c)}"${catActive ? ' data-active="1"' : ''}>${escapeHtml(c)}</button>`;
            }).join('')}
          </div>
        ` : ''}

        <p class="filter-label topic-title">${t('trendingNow')}</p>
        <p class="topic-hint">${t('tapTopicToggle')}</p>
        ${feedState.loadingTopics ? '<div class="topics-loading"><div class="spinner spinner-white"></div></div>' : `
          <div class="chip-scroll topic-chips">
            ${mergeTopicChips(feedState.trendingTopics, feedState.activeTopic).map((topic) => {
              const active = isActiveTopicChip(feedState.activeTopic, topic, feedState.feedMode);
              return `
                <button type="button" class="chip trend ${active ? 'active' : ''}" data-topic="${escapeHtml(topic.id)}" data-label="${escapeHtml(topic.label)}" data-query="${escapeHtml(topic.query || topic.label)}"${active ? ' data-active="1"' : ''}>
                  ${escapeHtml(topic.label)}${active ? ' ✕' : ''}
                </button>`;
            }).join('')}
          </div>
        `}

        ${isBriefingEnabled() ? `
        <button type="button" class="briefing-btn" id="briefing-btn">
          <span class="briefing-icon">${feedState.briefingPlaying ? '⏹' : '🎧'}</span>
          <span class="briefing-text">
            <strong>${feedState.briefingPlaying ? t('stop') : t('morningBriefing')}</strong>
            <small>${t('todayBriefing')}</small>
          </span>
          <span class="briefing-arrow">›</span>
        </button>
        ` : ''}
      </header>

      <main class="feed-main" id="feed-main">
        <p class="feed-label">${escapeHtml(feedLabel() || '')}</p>
        <div class="feed-list" id="feed-list">
          ${feedState.loading && !feedState.items.length ? '<div class="loader"><div class="spinner"></div></div>' : ''}
          ${feedState.items.map((item, i) => renderNewsCard(item, i, {
            isSpeaking: feedState.speakingId === item._id,
            expanded: feedState.expandedIds.has(item._id),
          })).join('')}
          ${!feedState.loading && !feedState.items.length ? renderEmptyPanel({
            topics: feedState.trendingTopics,
            loading: feedState.loadingTopics,
            fetchingTopicId: feedState.fetchingTopicId,
            subscribedCategories: subscribed,
          }) : ''}
        </div>
        <div id="scroll-sentinel" class="scroll-sentinel">
          ${feedState.loading && feedState.items.length && feedState.page > 1 ? '<div class="loader"><div class="spinner"></div></div>' : ''}
          ${!feedState.loading && !feedState.hasMore && feedState.items.length ? `<p class="end-hint">${t('endOfFeed')}</p>` : ''}
          ${feedState.hasMore && feedState.items.length ? `<p class="end-hint">${t('scrollForMore')}</p>` : ''}
        </div>
      </main>
    </div>`;

  bindEvents();
}

function bindEvents() {
  document.getElementById('prefs-btn').onclick = () => {
    clearPreferencesSession();
    navigate('/preferences');
  };
  document.getElementById('logout-btn').onclick = logout;
  document.getElementById('tab-latest').onclick = resetToLatest;
  const briefingBtn = document.getElementById('briefing-btn');
  if (briefingBtn) briefingBtn.onclick = playMorningBriefing;

  document.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.filter;
      if (id === 'all') {
        if (feedState.filterAll) return;
        feedState.filterAll = true;
        feedState.selectedCategories = [];
        feedState.feedMode = 'latest';
        feedState.activeTopic = null;
        reloadFeedForFilterChange({ refresh: false });
        return;
      }
      if (btn.dataset.active === '1' || btn.classList.contains('active')) {
        feedState.filterAll = true;
        feedState.selectedCategories = [];
        feedState.feedMode = 'latest';
        feedState.activeTopic = null;
        reloadFeedForFilterChange({ refresh: false });
        return;
      }
      const next = nextCategoryFilterState(
        { filterAll: feedState.filterAll, selectedCategories: feedState.selectedCategories },
        id,
        getSubscribed(),
      );
      feedState.filterAll = next.filterAll;
      feedState.selectedCategories = next.selectedCategories;
      feedState.feedMode = 'latest';
      feedState.activeTopic = null;
      reloadFeedForFilterChange({ refresh: false });
    };
  });

  document.querySelectorAll('[data-topic]').forEach((btn) => {
    btn.onclick = () => onTopicPress({
      id: btn.dataset.topic,
      label: btn.dataset.label,
      query: btn.dataset.query,
    }, btn.dataset.active === '1' || btn.classList.contains('active'));
  });

  const list = document.getElementById('feed-list');
  bindNewsCards(list, {
    onOpen: (id) => navigate(`/story/${id}`),
    onDeepDive: (id) => navigate(`/story/${id}?deep=1`),
    onListen: (id) => {
      if (state.language !== 'en') return;
      if (feedState.speakingId === id) {
        stopSpeaking();
        feedState.speakingId = null;
      } else {
        stopSpeaking();
        const item = feedState.items.find((x) => x._id === id);
        if (item) {
          speakNewsCard(item, getSpeechLocale());
          feedState.speakingId = id;
        }
      }
      paint();
    },
    onExpand: (id) => {
      if (feedState.expandedIds.has(id)) feedState.expandedIds.delete(id);
      else feedState.expandedIds.add(id);
      paint();
    },
  });

  list.querySelectorAll('[data-empty-topic]').forEach((btn) => {
    const active = btn.dataset.active === '1';
    btn.onclick = () => onTopicPress({
      id: btn.dataset.emptyTopic,
      label: btn.dataset.label,
      query: btn.dataset.query,
    }, active);
  });
  list.querySelector('#empty-refresh')?.addEventListener('click', refreshFeed);
  list.querySelector('#empty-prefs')?.addEventListener('click', () => {
    clearPreferencesSession();
    navigate('/preferences');
  });
}

function setupInfiniteScroll() {
  const sentinel = document.getElementById('scroll-sentinel');
  if (!sentinel) return;
  if (observer) observer.disconnect();
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && feedState.hasMore && !feedState.loading) {
      loadFeed(feedState.page + 1, false);
    }
  }, { rootMargin: '240px' });
  observer.observe(sentinel);
}

function setupPullRefresh() {
  const main = document.getElementById('feed-main');
  if (!main || main.dataset.pullBound) return;
  main.dataset.pullBound = '1';

  main.addEventListener('touchstart', (e) => {
    if (window.scrollY <= 0) {
      pullStartY = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  main.addEventListener('touchmove', (e) => {
    if (!pulling || feedState.refreshing) return;
    const delta = e.touches[0].clientY - pullStartY;
    const indicator = document.getElementById('pull-indicator');
    if (delta > 60 && window.scrollY <= 0) {
      indicator?.classList.add('visible');
    }
  }, { passive: true });

  main.addEventListener('touchend', (e) => {
    if (!pulling) return;
    const delta = (e.changedTouches[0]?.clientY || 0) - pullStartY;
    pulling = false;
    document.getElementById('pull-indicator')?.classList.remove('visible');
    if (delta > 80 && window.scrollY <= 0) refreshFeed();
  }, { passive: true });

  // Desktop: refresh on F5 area - double-click header
  document.querySelector('.site-header')?.addEventListener('dblclick', refreshFeed);
}

export async function renderHome(app) {
  rootEl = app;
  feedState.items = [];
  feedState.page = 1;
  feedState.hasMore = false;
  feedState.feedMode = 'latest';
  feedState.activeTopic = null;
  feedState.filterAll = true;
  feedState.selectedCategories = [];
  feedState.speakingId = null;
  feedState.briefingPlaying = false;
  feedState.expandedIds = new Set();

  const fromPrefs = consumeFeedFilterFromPrefs();
  if (fromPrefs) {
    feedState.filterAll = fromPrefs.filterAll;
    feedState.selectedCategories = fromPrefs.selectedCategories;
  }

  await loadTrendingTopics();
  await loadFeed(1, true);
}

export function cleanupHome() {
  stopSpeaking();
  if (observer) observer.disconnect();
}
