import { t } from '../i18n.js';
import { escapeHtml } from '../router.js';

export function renderDisclaimer() {
  return `
    <div class="disclaimer-box">
      <div class="disclaimer-head">
        <span class="disclaimer-icon">ℹ</span>
        <strong>${escapeHtml(t('disclaimerTitle'))}</strong>
      </div>
      <p>${escapeHtml(t('disclaimerText'))}</p>
    </div>`;
}
