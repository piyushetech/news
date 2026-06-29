import { t } from '../i18n.js';
import { escapeHtml } from '../router.js';

const ITEM_KEYS = [
  { key: 'who', labelKey: 'deepDiveWho', icon: '👥', color: '#7c3aed', bg: '#f3e8ff' },
  { key: 'what', labelKey: 'deepDiveWhat', icon: '📰', color: '#0284c7', bg: '#e0f2fe' },
  { key: 'where', labelKey: 'deepDiveWhere', icon: '📍', color: '#059669', bg: '#d1fae5' },
  { key: 'when', labelKey: 'deepDiveWhen', icon: '🕐', color: '#d97706', bg: '#fef3c7' },
  { key: 'why', labelKey: 'deepDiveWhy', icon: '❓', color: '#dc2626', bg: '#fee2e2' },
  { key: 'how', labelKey: 'deepDiveHow', icon: '🔗', color: '#6366f1', bg: '#e0e7ff' },
];

export function renderDeepDivePanel(data, { loading = false, title, showTitle = true } = {}) {
  const panelTitle = title ?? t('deepDive');
  const subtitle = t('deepDiveSubtitle');
  const headerTitle = showTitle
    ? `<strong>${escapeHtml(panelTitle)}</strong>`
    : '';
  const headerSub = showTitle
    ? `<span class="deep-dive-sub">${escapeHtml(subtitle)}</span>`
    : `<strong class="deep-dive-sub-only">${escapeHtml(subtitle)}</strong>`;

  if (loading) {
    return `
      <div class="deep-dive-panel">
        <div class="deep-dive-header">
          <span class="deep-dive-icon">📚</span>
          <div>${headerTitle}${headerSub}</div>
        </div>
        <div class="deep-dive-loading">
          <div class="spinner"></div>
          <span>${escapeHtml(t('deepDiveLoading'))}</span>
        </div>
      </div>`;
  }

  if (!data) return '';

  return `
    <div class="deep-dive-panel" id="deep-dive-panel">
      <div class="deep-dive-header">
        <span class="deep-dive-icon deep-dive-icon-solid">📚</span>
        <div>
          ${headerTitle}
          ${headerSub}
        </div>
      </div>
      <div class="deep-dive-grid">
        ${ITEM_KEYS.map(({ key, labelKey, icon, color, bg }) => `
          <div class="deep-dive-card">
            <span class="deep-dive-card-icon" style="background:${bg};color:${color}">${icon}</span>
            <span class="deep-dive-card-label" style="color:${color}">${escapeHtml(t(labelKey))}</span>
            <p>${escapeHtml(data[key] || '—')}</p>
          </div>
        `).join('')}
      </div>
      <div class="deep-dive-footer">
        <span>✨</span>
        <span>${escapeHtml(t('deepDiveFooter'))}</span>
      </div>
    </div>`;
}
