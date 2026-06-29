import { t } from '../i18n.js';
import { escapeHtml } from '../router.js';

const TOPIC_ICONS = {
  Politics: '📢',
  Cricket: '🏏',
  Technology: '💻',
  Crime: '🛡',
  Business: '📈',
  Sports: '⚽',
  Science: '🧪',
  World: '🌍',
  National: '🚩',
  Entertainment: '🎬',
  History: '📚',
  General: '📰',
};

export function renderEmptyPanel({
  topics = [],
  loading = false,
  fetchingTopicId = null,
  subscribedCategories = [],
  showActions = true,
} = {}) {
  return `
    <div class="empty-panel">
      <div class="empty-hero">
        <div class="empty-hero-icon">✨</div>
        <h3>${escapeHtml(t('noStories'))}</h3>
        <p>${escapeHtml(t('latestTopicsHint'))}</p>
      </div>
      ${loading ? '<div class="loader"><div class="spinner"></div></div>' : ''}
      ${!loading && topics.length ? `
        <div class="empty-topics">
          <p class="empty-section-label">${escapeHtml(t('trendingNow'))}</p>
          ${topics.map((topic) => {
            const busy = fetchingTopicId === topic.id;
            const icon = TOPIC_ICONS[topic.category] || '⚡';
            return `
              <button type="button" class="empty-topic-row" data-empty-topic="${escapeHtml(topic.id)}" data-label="${escapeHtml(topic.label)}" data-query="${escapeHtml(topic.query || topic.label)}" ${fetchingTopicId ? 'disabled' : ''}>
                <span class="empty-topic-icon">${busy ? '<span class="spinner spinner-sm"></span>' : icon}</span>
                <span class="empty-topic-body">
                  <strong>${escapeHtml(topic.label)}</strong>
                  <small>${escapeHtml(topic.category)} · ${escapeHtml(t('tapToGetStories'))}</small>
                </span>
                <span class="empty-topic-arrow">›</span>
              </button>`;
          }).join('')}
        </div>
      ` : ''}
      ${!loading && !topics.length && subscribedCategories.length ? `
        <div class="empty-fallback">
          <p class="empty-section-label">${escapeHtml(t('yourTopics'))}</p>
          <div class="empty-chip-row">
            ${subscribedCategories.map((cat) => `<span class="empty-cat-chip">${escapeHtml(cat)}</span>`).join('')}
          </div>
          <p class="empty-fallback-hint">${escapeHtml(t('pullToRefreshHint'))}</p>
        </div>
      ` : ''}
      ${showActions ? `
        <div class="empty-actions">
          <button type="button" class="btn btn-primary btn-block" id="empty-refresh">↻ ${escapeHtml(t('refreshStories'))}</button>
          <button type="button" class="btn btn-outline btn-block" id="empty-prefs">⚙ ${escapeHtml(t('pickTopics'))}</button>
        </div>
      ` : ''}
    </div>`;
}
