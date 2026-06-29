import { authApi, newsApi } from '../api.js';
import { state, persistUser } from '../state.js';
import { escapeHtml, navigate } from '../router.js';
import { t } from '../i18n.js';
import { shouldGateBriefing } from './briefing.js';
import { storeFeedFilterFromPrefs } from '../utils/feedFilter.js';

const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو' },
];

let prefsSession = null;
let prefsLoadInFlight = null;
let prefsLoadGen = 0;

export function clearPreferencesSession() {
  prefsSession = null;
  prefsLoadInFlight = null;
}

function topicCountLabel(count) {
  return `${count} ${t('topicsSelected')}`;
}

function toggleTopicChip(set, id, btn) {
  if (set.has(id)) set.delete(id);
  else set.add(id);
  btn.classList.toggle('active', set.has(id));
}

function toggleNotifyChip(set, id, btn) {
  if (set.has(id)) set.delete(id);
  else set.add(id);
  const active = set.has(id);
  btn.classList.toggle('active', active);
  const iconEl = btn.querySelector('.pref-chip-icon');
  if (iconEl) iconEl.textContent = active ? '🔔' : '🔕';
}

function updateTopicFooter(subscribed) {
  const countEl = document.getElementById('topic-count');
  const saveBtn = document.getElementById('save-prefs');
  const count = subscribed.size;
  if (countEl) countEl.textContent = topicCountLabel(count);
  if (saveBtn) {
    saveBtn.disabled = count < 1;
    saveBtn.classList.toggle('btn-disabled', count < 1);
  }
}

function renderTopicChip(category, active) {
  return `
    <button type="button" class="topic-pick pref-chip topic-chip${active ? ' active' : ''}" data-topic-id="${escapeHtml(category.id)}">
      <span class="pref-chip-icon">${category.icon}</span>
      <span>${escapeHtml(category.label)}</span>
    </button>`;
}

function renderNotifyChip(category, active) {
  return `
    <button type="button" class="topic-pick pref-chip notify-chip${active ? ' active' : ''}" data-notify-id="${escapeHtml(category.id)}">
      <span class="pref-chip-icon">${active ? '🔔' : '🔕'}</span>
      <span>${escapeHtml(category.label)}</span>
    </button>`;
}

function bindPreferencesEvents(subscribed, notify, selectedLangRef) {
  document.getElementById('back-btn').onclick = () => {
    clearPreferencesSession();
    navigate('/');
  };

  document.getElementById('lang-grid').onclick = (e) => {
    const btn = e.target.closest('[data-lang]');
    if (!btn) return;
    selectedLangRef.current = btn.dataset.lang;
    prefsSession.selectedLang = selectedLangRef.current;
    prefsSession.dirty = true;
    document.querySelectorAll('#lang-grid .lang-chip').forEach((el) => {
      el.classList.toggle('active', el.dataset.lang === selectedLangRef.current);
    });
  };

  document.getElementById('topic-grid').onclick = (e) => {
    const btn = e.target.closest('[data-topic-id]');
    if (!btn) return;
    toggleTopicChip(subscribed, btn.dataset.topicId, btn);
    prefsSession.dirty = true;
    updateTopicFooter(subscribed);
  };

  document.getElementById('notify-grid').onclick = (e) => {
    const btn = e.target.closest('[data-notify-id]');
    if (!btn) return;
    toggleNotifyChip(notify, btn.dataset.notifyId, btn);
    prefsSession.dirty = true;
  };

  document.getElementById('save-prefs').onclick = async () => {
    if (subscribed.size < 1) return;
    if (notify.size < 1) {
      alert('Pick at least one category for notifications.');
      return;
    }
    const saveBtn = document.getElementById('save-prefs');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    const payload = {
      subscribedCategories: [...subscribed],
      notificationCategories: [...notify],
      preferredLanguage: selectedLangRef.current,
      countryCode: state.countryCode,
    };
    try {
      const res = await authApi.updatePreferences(payload);
      const saved = res.data?.data;
      if (saved) {
        persistUser({
          ...saved,
          subscribedCategories: [...(saved.subscribedCategories || [])],
          notificationCategories: [...(saved.notificationCategories || [])],
        });
      }
      state.language = selectedLangRef.current;
      clearPreferencesSession();
      storeFeedFilterFromPrefs(payload.subscribedCategories);
      if (shouldGateBriefing()) navigate('/briefing');
      else navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || 'Could not save preferences.');
      saveBtn.textContent = `${t('continueToFeed')} →`;
      updateTopicFooter(subscribed);
      saveBtn.disabled = subscribed.size < 1;
    }
  };
}

function paintPreferences(app, categories, subscribed, notify, selectedLang) {
  app.innerHTML = `
    <div class="page prefs-page">
      <header class="top-bar">
        <button type="button" class="icon-btn" id="back-btn" aria-label="Back">←</button>
        <h1>Your topics</h1>
      </header>
      <div class="prefs-body">
        <p class="prefs-sub">Pick what you want to read and get your personalized feed.</p>
        <h2 class="section-label">Language</h2>
        <div class="lang-grid" id="lang-grid">
          ${LANGUAGES.map((l) => `
            <button type="button" class="lang-chip ${l.code === selectedLang ? 'active' : ''}" data-lang="${l.code}">
              <strong>${escapeHtml(l.nativeLabel)}</strong>
              <span>${escapeHtml(l.label)}</span>
            </button>
          `).join('')}
        </div>
        <h2 class="section-label">Topics to follow</h2>
        <p class="prefs-hint">Tap to select or deselect. Saved when you tap Continue to Feed.</p>
        <div class="topic-grid pref-chip-grid" id="topic-grid">
          ${categories.map((c) => renderTopicChip(c, subscribed.has(c.id))).join('')}
        </div>
        <h2 class="section-label">Notify me for</h2>
        <p class="prefs-hint">Push alerts for these topics.</p>
        <div class="topic-grid pref-chip-grid notify-grid" id="notify-grid">
          ${categories.map((c) => renderNotifyChip(c, notify.has(c.id))).join('')}
        </div>
      </div>
      <footer class="prefs-footer">
        <p class="prefs-count" id="topic-count">${escapeHtml(topicCountLabel(subscribed.size))}</p>
        <button type="button" class="btn btn-primary btn-block${subscribed.size < 1 ? ' btn-disabled' : ''}" id="save-prefs" ${subscribed.size < 1 ? 'disabled' : ''}>
          ${escapeHtml(t('continueToFeed'))} →
        </button>
      </footer>
    </div>`;
}

function isStalePrefsLoad(loadGen) {
  return loadGen !== prefsLoadGen || prefsSession?.dirty;
}

async function loadPreferencesFromDb(app) {
  const loadGen = ++prefsLoadGen;

  app.innerHTML = `
    <div class="page prefs-page">
      <div class="loader" style="min-height:60vh"><div class="spinner"></div></div>
    </div>`;

  let dbUser;
  try {
    const meRes = await authApi.getMe();
    if (isStalePrefsLoad(loadGen)) return;
    dbUser = meRes.data?.data;
    if (!dbUser) throw new Error('No user data');
  } catch {
    if (isStalePrefsLoad(loadGen)) return;
    app.innerHTML = `
      <div class="page prefs-page">
        <div class="prefs-body">
          <p class="prefs-sub">Could not load your saved topics. Check your connection and try again.</p>
          <button type="button" class="btn btn-primary btn-block" id="retry-prefs">Retry</button>
          <button type="button" class="btn btn-outline btn-block" id="back-prefs">Back to feed</button>
        </div>
      </div>`;
    document.getElementById('retry-prefs')?.addEventListener('click', () => {
      clearPreferencesSession();
      renderPreferences(app);
    });
    document.getElementById('back-prefs')?.addEventListener('click', () => navigate('/'));
    return;
  }

  const catRes = await newsApi.getCategories();
  if (isStalePrefsLoad(loadGen)) return;
  const categories = catRes.data.data;

  const subscribedList = Array.isArray(dbUser.subscribedCategories)
    ? [...dbUser.subscribedCategories]
    : [];
  const notifyList = Array.isArray(dbUser.notificationCategories) && dbUser.notificationCategories.length
    ? [...dbUser.notificationCategories]
    : subscribedList;

  if (isStalePrefsLoad(loadGen)) return;

  prefsSession = {
    subscribed: new Set(subscribedList),
    notify: new Set(notifyList),
    selectedLang: dbUser.preferredLanguage || state.language || 'en',
    dirty: false,
    ready: true,
  };

  persistUser({
    ...dbUser,
    subscribedCategories: subscribedList,
    notificationCategories: notifyList,
  });

  const { subscribed, notify } = prefsSession;
  const selectedLangRef = { current: prefsSession.selectedLang };

  paintPreferences(app, categories, subscribed, notify, selectedLangRef.current);
  bindPreferencesEvents(subscribed, notify, selectedLangRef);
}

export async function renderPreferences(app) {
  if (prefsSession?.dirty) return;
  if (prefsSession?.ready) return;

  if (prefsLoadInFlight) {
    await prefsLoadInFlight;
    return;
  }

  prefsLoadInFlight = loadPreferencesFromDb(app);
  try {
    await prefsLoadInFlight;
  } finally {
    prefsLoadInFlight = null;
  }
}
