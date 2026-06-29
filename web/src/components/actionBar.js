import { escapeHtml } from '../router.js';

export function renderActionBar(actions) {
  const visible = actions.filter((a) => !a.hidden);
  return `
    <div class="story-action-bar">
      <div class="story-action-row">
        ${visible.map((action) => `
          <button type="button"
            class="story-action-chip ${action.active ? 'active' : ''}"
            data-action="${action.id}"
            ${action.loading ? 'disabled' : ''}>
            ${action.loading ? '<span class="spinner spinner-sm"></span>' : `<span class="action-icon">${action.icon}</span>`}
            <span>${escapeHtml(action.label)}</span>
          </button>
        `).join('')}
      </div>
    </div>`;
}

export const ACTION_ICONS = {
  listen: '🔊',
  stop: '⏹',
  readMore: '📖',
  readLess: '📕',
  eli5: '🎓',
  deepDive: '📚',
  source: '↗',
  bias: '⚖',
};
