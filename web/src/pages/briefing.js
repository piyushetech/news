import { newsApi } from '../api.js';
import { state } from '../state.js';
import { escapeHtml, navigate } from '../router.js';
import { formatDateTime } from '../utils/formatTime.js';
import { t } from '../i18n.js';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function isBriefingDoneToday() {
  return localStorage.getItem('briefingCompletedDate') === todayKey();
}

export function isBriefingEnabled() {
  return state.language === 'en';
}

export function shouldGateBriefing() {
  return isBriefingEnabled() && !isBriefingDoneToday();
}

export function markBriefingDone() {
  localStorage.setItem('briefingCompletedDate', todayKey());
}

export async function renderBriefing(app) {
  if (!isBriefingEnabled()) {
    navigate('/');
    return;
  }
  app.innerHTML = '<div class="briefing-loading"><div class="spinner"></div></div>';

  let stories = [];
  try {
    const res = await newsApi.getBriefing(state.countryCode, state.language);
    stories = res.data.data.stories || [];
  } catch { /* ignore */ }

  if (!stories.length) {
    markBriefingDone();
    navigate('/');
    return;
  }

  let currentIndex = 0;
  const swipe = {
    up: () => {},
    down: () => {},
  };

  const complete = () => {
    markBriefingDone();
    navigate('/');
  };

  const render = () => {
    const item = stories[currentIndex];
    app.innerHTML = `
      <div class="briefing-page">
        ${item.imageUrl
          ? `<img class="briefing-bg" src="${escapeHtml(item.imageUrl)}" alt="" />`
          : '<div class="briefing-bg briefing-bg-placeholder">📰</div>'}
        <div class="briefing-overlay"></div>
        <div class="briefing-content">
          <div class="briefing-top">
            <span class="briefing-label">${escapeHtml(t('todayBriefing'))}</span>
            <button type="button" class="briefing-skip" id="skip-briefing">${escapeHtml(t('skipBriefing'))}</button>
          </div>
          <div class="briefing-progress">
            ${stories.map((_, i) => `<span class="briefing-dot ${i <= currentIndex ? 'active' : ''}"></span>`).join('')}
          </div>
          <span class="briefing-badge">${escapeHtml(item.category)}</span>
          <h1>${escapeHtml(item.heading)}</h1>
          <p class="briefing-para">${escapeHtml(item.paragraph)}</p>
          <p class="briefing-time">${formatDateTime(item.publishedAt)}</p>
          ${item.fullContent && item.fullContent !== item.paragraph
            ? `<p class="briefing-full">${escapeHtml(item.fullContent)}</p>` : ''}
          ${item.originalLink ? `
            <a class="briefing-source" href="${escapeHtml(item.originalLink)}" target="_blank" rel="noopener">
              ↗ ${escapeHtml(t('readOriginal'))}
            </a>
          ` : ''}
          <div class="briefing-nav">
            <p>${currentIndex < stories.length - 1 ? t('swipeUp') : ''}</p>
            <p class="briefing-count">${t('storyOf')} ${currentIndex + 1} / ${stories.length}</p>
            <div class="briefing-buttons">
              ${currentIndex > 0 ? '<button type="button" class="btn btn-ghost-sm" id="prev-story">↑ Previous</button>' : ''}
              ${currentIndex < stories.length - 1
                ? '<button type="button" class="btn btn-primary" id="next-story">Next story ↓</button>'
                : `<button type="button" class="btn btn-primary btn-block briefing-continue" id="enter-app">${escapeHtml(t('continueToFeed'))} →</button>`}
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById('skip-briefing').onclick = complete;
    document.getElementById('next-story')?.addEventListener('click', () => {
      currentIndex += 1;
      render();
    });
    document.getElementById('prev-story')?.addEventListener('click', () => {
      currentIndex -= 1;
      render();
    });
    document.getElementById('enter-app')?.addEventListener('click', complete);

    swipe.up = () => {
      if (currentIndex < stories.length - 1) {
        currentIndex += 1;
        render();
      }
    };
    swipe.down = () => {
      if (currentIndex > 0) {
        currentIndex -= 1;
        render();
      }
    };
  };

  bindBriefingSwipe(app, () => swipe.up(), () => swipe.down());
  render();
}

function bindBriefingSwipe(root, onSwipeUp, onSwipeDown) {
  let startY = 0;
  let startTime = 0;

  const onTouchStart = (e) => {
    startY = e.touches[0].clientY;
    startTime = Date.now();
  };

  const onTouchEnd = (e) => {
    const dy = startY - e.changedTouches[0].clientY;
    if (Date.now() - startTime > 600) return;
    if (dy > 50) onSwipeUp();
    else if (dy < -50) onSwipeDown();
  };

  const onWheel = (e) => {
    if (Math.abs(e.deltaY) < 30) return;
    if (e.deltaY > 0) onSwipeUp();
    else onSwipeDown();
  };

  root.addEventListener('touchstart', onTouchStart, { passive: true });
  root.addEventListener('touchend', onTouchEnd, { passive: true });
  root.addEventListener('wheel', onWheel, { passive: true });
}
