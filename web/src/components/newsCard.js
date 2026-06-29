import { t } from '../i18n.js';
import { state } from '../state.js';
import { escapeHtml } from '../router.js';
import { formatDateTime } from '../utils/formatTime.js';
import { buildReadMoreText } from '../utils/truncateText.js';
import { categoryColor, categoryEmoji } from '../theme.js';

const CARD_PREVIEW = { maxLines: 4, charsPerLine: 46 };

export function renderNewsCard(item, index, { isSpeaking = false, expanded = false } = {}) {
  const catColor = categoryColor(item.category);
  const paragraph = item.paragraph?.trim() && item.paragraph.trim() !== item.heading.trim()
    ? item.paragraph
    : 'Summary loading soon. Tap to read more.';
  const hasLongForm = !!(item.fullContent && item.fullContent.length > paragraph.length);
  const expandTarget = hasLongForm ? item.fullContent : paragraph;

  let displayText;
  let showReadMore;

  if (expanded) {
    displayText = expandTarget;
    showReadMore = true;
  } else {
    const previewSource = hasLongForm ? paragraph : expandTarget;
    const preview = buildReadMoreText(previewSource, false, CARD_PREVIEW);
    displayText = preview.text;
    showReadMore = hasLongForm || preview.showToggle;
  }

  const toggleLabel = expanded ? t('readLess') : t('readMore');

  const img = item.imageUrl
    ? `<img class="card-img" src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" />`
    : `<div class="card-img-placeholder" style="background:${catColor}22"><span style="color:${catColor};font-size:40px">${categoryEmoji(item.category)}</span></div>`;

  return `
    <article class="news-card" data-id="${item._id}">
      ${img}
      <div class="card-body">
        <div class="card-top">
          <span class="cat-badge" style="background:${catColor}18;color:${catColor}">${escapeHtml(item.category)}</span>
          <span class="card-num">#${index + 1}</span>
        </div>
        <h2 class="card-title">${escapeHtml(item.heading)}</h2>
        <p class="card-text-flow">${escapeHtml(displayText)}${showReadMore ? `<button type="button" class="read-more-inline" data-expand="${item._id}">${escapeHtml(toggleLabel)}</button>` : ''}</p>
        <div class="card-meta">
          <span class="card-source">${escapeHtml(item.source)}</span>
          <div class="card-meta-right">
            ${(item.commentCount ?? 0) > 0 ? `<span class="card-comments">💬 ${item.commentCount}</span>` : ''}
            <span class="card-time">${formatDateTime(item.publishedAt)}</span>
          </div>
        </div>
        <div class="card-actions">
          ${state.language === 'en' ? `
          <button type="button" class="action-btn ${isSpeaking ? 'active' : ''}" data-listen="${item._id}">
            ${isSpeaking ? '⏹' : '🔊'} ${isSpeaking ? t('stop') : t('listen')}
          </button>
          ` : ''}
          ${item.originalLink ? `
            <a class="action-btn" href="${escapeHtml(item.originalLink)}" target="_blank" rel="noopener" data-source>
              ↗ ${t('source')}
            </a>
          ` : ''}
          <button type="button" class="action-btn" data-deep-dive="${item._id}">
            📚 ${t('deepDive')}
          </button>
        </div>
      </div>
    </article>`;
}

export function bindNewsCards(root, handlers) {
  root.querySelectorAll('.news-card').forEach((el) => {
    const id = el.dataset.id;
    el.onclick = (e) => {
      if (e.target.closest('[data-listen], [data-expand], [data-source], [data-deep-dive], a, button')) return;
      handlers.onOpen?.(id);
    };
  });
  root.querySelectorAll('[data-listen]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      handlers.onListen?.(btn.dataset.listen);
    };
  });
  root.querySelectorAll('[data-expand]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      handlers.onExpand?.(btn.dataset.expand);
    };
  });
  root.querySelectorAll('[data-deep-dive]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      handlers.onDeepDive?.(btn.dataset.deepDive);
    };
  });
  root.querySelectorAll('[data-source]').forEach((a) => {
    a.onclick = (e) => e.stopPropagation();
  });
}
