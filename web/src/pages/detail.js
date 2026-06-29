import { newsApi } from '../api.js';
import { state, getSpeechLocale } from '../state.js';
import { escapeHtml, navigate } from '../router.js';
import { formatDateTime } from '../utils/formatTime.js';
import { t } from '../i18n.js';
import { speakText, stopSpeaking } from '../tts.js';
import { renderActionBar, ACTION_ICONS } from '../components/actionBar.js';
import { renderDeepDivePanel } from '../components/deepDive.js';
import { renderDisclaimer } from '../components/disclaimer.js';
import { buildReadMoreText } from '../utils/truncateText.js';

export async function renderDetail(app, storyId, { scrollToDeepDive: scrollOnMount = false } = {}) {
  app.innerHTML = '<div class="loader page-loader"><div class="spinner"></div></div>';

  let news;
  try {
    const res = await newsApi.getById(storyId, state.language);
    news = res.data.data;
  } catch {
    app.innerHTML = '<div class="empty-page"><p>Story not found.</p><button class="btn btn-primary" id="back">← Back</button></div>';
    document.getElementById('back').onclick = () => navigate('/');
    return;
  }

  const ui = {
    displayText: news.paragraph,
    showFull: false,
    eli5Mode: false,
    speaking: false,
    deepDive: null,
    loadingDeepDive: true,
    bias: news.biasLeft && news.biasRight ? { left: news.biasLeft, right: news.biasRight } : null,
    biasSide: 'left',
    showBias: false,
    loadingAi: null,
    comments: [],
    commentText: '',
    postingComment: false,
    biasedCount: news.biasedCount || 0,
    userMarkedBiased: false,
    loadingEngagement: true,
  };

  const showBiasSection = news.isControversial || news.category === 'Politics';
  const hasFullContent = !!(news.fullContent && news.fullContent.length > news.paragraph.length);

  const toggleListen = () => {
    if (state.language !== 'en') return;
    if (ui.speaking) {
      stopSpeaking();
      ui.speaking = false;
    } else {
      const text = ui.showFull && news.fullContent ? news.fullContent : ui.displayText;
      speakText(`${news.heading}. ${text}`, () => { ui.speaking = false; render(); }, getSpeechLocale());
      ui.speaking = true;
    }
    render();
  };

  const toggleEli5 = async () => {
    if (ui.eli5Mode) {
      ui.displayText = news.paragraph;
      ui.eli5Mode = false;
      render();
      return;
    }
    ui.loadingAi = 'eli5';
    render();
    try {
      const res = await newsApi.getEli5(storyId);
      ui.displayText = res.data.data.eli5Summary;
      ui.eli5Mode = true;
    } catch {
      ui.displayText = `Think of it like this: ${news.paragraph}`;
      ui.eli5Mode = true;
    } finally {
      ui.loadingAi = null;
      render();
    }
  };

  const ensureBias = async () => {
    if (ui.showBias) {
      ui.showBias = false;
      render();
      return;
    }
    if (ui.bias) {
      ui.showBias = true;
      render();
      return;
    }
    ui.loadingAi = 'bias';
    render();
    try {
      const res = await newsApi.getBias(storyId, state.language);
      ui.bias = { left: res.data.data.left, right: res.data.data.right };
      ui.showBias = true;
    } catch { /* ignore */ }
    finally {
      ui.loadingAi = null;
      render();
    }
  };

  const refreshBiasTranslation = async () => {
    if (!ui.showBias) return;
    try {
      const res = await newsApi.getBias(storyId, state.language);
      ui.bias = { left: res.data.data.left, right: res.data.data.right };
      render();
    } catch { /* ignore */ }
  };

  const loadDeepDive = async () => {
    ui.loadingDeepDive = true;
    render();
    try {
      const res = await newsApi.getDeepDive(storyId, state.language);
      ui.deepDive = res.data.data;
    } catch { /* ignore */ }
    finally {
      ui.loadingDeepDive = false;
      render();
      if (scrollOnMount) {
        setTimeout(() => scrollToDeepDiveSection(), 300);
      }
    }
  };

  const scrollToDeepDiveSection = () => {
    document.getElementById('deep-dive-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAction = async (id) => {
    switch (id) {
      case 'listen': toggleListen(); break;
      case 'eli5': await toggleEli5(); break;
      case 'source':
        if (news.originalLink) window.open(news.originalLink, '_blank', 'noopener');
        break;
      case 'bias': await ensureBias(); break;
      default: break;
    }
  };

  const render = () => {
    const fullBody = ui.showFull && news.fullContent ? news.fullContent : ui.displayText;
    const preview = buildReadMoreText(fullBody, ui.showFull, { maxLines: 6, charsPerLine: 52 });
    const bodyText = preview.text;
    const showReadToggle = hasFullContent || preview.showToggle || ui.showFull;
    const toggleLabel = ui.showFull ? t('readLess') : t('readMore');

    const hero = news.imageUrl ? `
      <div class="detail-hero-wrap">
        <img class="detail-hero" src="${escapeHtml(news.imageUrl)}" alt="" />
        <div class="detail-hero-overlay"></div>
        <button type="button" class="detail-back" id="back-btn">←</button>
        <div class="detail-hero-content">
          <span class="detail-badge">${escapeHtml(news.category)}</span>
          <h1>${escapeHtml(news.heading)}</h1>
        </div>
      </div>` : `
      <div class="detail-hero-plain">
        <button type="button" class="detail-back" id="back-btn">←</button>
        <span class="detail-badge">${escapeHtml(news.category)}</span>
        <h1>${escapeHtml(news.heading)}</h1>
      </div>`;

    app.innerHTML = `
      <div class="detail-page">
        ${hero}
        <div class="detail-body">
          <div class="detail-meta">
            <strong>${escapeHtml(news.source)}</strong>
            <span>${formatDateTime(news.publishedAt)}</span>
          </div>
          ${ui.eli5Mode ? `<div class="eli5-banner">😊 ${t('eli5')} ${t('eli5Mode')}</div>` : ''}
          <p class="detail-text-flow">${escapeHtml(bodyText)}${showReadToggle ? `<button type="button" class="read-more-inline" id="toggle-read-more">${escapeHtml(toggleLabel)}</button>` : ''}</p>

          ${renderActionBar([
            { id: 'listen', label: ui.speaking ? t('stop') : t('listen'), icon: ui.speaking ? ACTION_ICONS.stop : ACTION_ICONS.listen, active: ui.speaking, hidden: state.language !== 'en' },
            { id: 'eli5', label: t('eli5'), icon: ACTION_ICONS.eli5, active: ui.eli5Mode, loading: ui.loadingAi === 'eli5' },
            { id: 'source', label: t('source'), icon: ACTION_ICONS.source, hidden: !news.originalLink },
            { id: 'bias', label: t('bias'), icon: ACTION_ICONS.bias, active: ui.showBias, loading: ui.loadingAi === 'bias', hidden: !showBiasSection },
          ])}

          ${renderDisclaimer()}
          ${renderDeepDivePanel(ui.deepDive, { loading: ui.loadingDeepDive, showTitle: false })}

          ${showBiasSection && ui.showBias ? `
            <div class="bias-box">
              <h3>${escapeHtml(t('biasPerspectives'))}</h3>
              <div class="bias-toggle">
                <button type="button" class="bias-tab ${ui.biasSide === 'left' ? 'active' : ''}" data-bias="left">${escapeHtml(t('biasLeft'))}</button>
                <button type="button" class="bias-tab ${ui.biasSide === 'right' ? 'active' : ''}" data-bias="right">${escapeHtml(t('biasRight'))}</button>
              </div>
              ${ui.loadingAi === 'bias' ? '<div class="loader"><div class="spinner"></div></div>' : ui.bias
                ? `<p class="bias-text">${escapeHtml(ui.biasSide === 'left' ? ui.bias.left : ui.bias.right)}</p>`
                : `<p class="bias-hint">${escapeHtml(t('biasTapHint'))}</p>`}
            </div>
          ` : ''}

          <button type="button" class="bias-feedback ${ui.userMarkedBiased ? 'marked' : ''}" id="bias-feedback">
            <span>${ui.userMarkedBiased ? '✓' : '⚠'}</span>
            <span>
              <strong>${escapeHtml(ui.userMarkedBiased ? t('markedBiased') : t('feelsBiased'))}</strong>
              <small>${escapeHtml(ui.userMarkedBiased
                ? t('undoBiased')
                : `${ui.biasedCount} ${ui.biasedCount === 1 ? t('readerFlagged') : t('readersFlagged')}`)}</small>
            </span>
          </button>

          <section class="comments-box">
            <h2>${escapeHtml(t('comments'))} (${ui.comments.length})</h2>
            <div class="comment-form">
              <textarea id="comment-input" placeholder="${escapeHtml(t('shareYourView'))}" rows="3" maxlength="500">${escapeHtml(ui.commentText)}</textarea>
              <button type="button" class="send-btn" id="post-comment" ${!ui.commentText.trim() || ui.postingComment ? 'disabled' : ''}>
                ${ui.postingComment ? '<span class="spinner spinner-sm spinner-white"></span>' : '➤'}
              </button>
            </div>
            ${ui.loadingEngagement ? '<div class="loader"><div class="spinner"></div></div>' : ''}
            ${!ui.loadingEngagement && !ui.comments.length ? `<p class="no-comments">${escapeHtml(t('beFirstComment'))}</p>` : ''}
            <div class="comments-list">
              ${ui.comments.map((c) => `
                <div class="comment-item">
                  <div class="comment-avatar">${escapeHtml(c.userName.charAt(0))}</div>
                  <div>
                    <div class="comment-head">
                      <strong>${escapeHtml(c.userName)}</strong>
                      <span>${formatDateTime(c.createdAt)}</span>
                    </div>
                    <p>${escapeHtml(c.text)}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </section>

          ${news.originalLink ? `
            <a class="btn btn-primary btn-block original-link" href="${escapeHtml(news.originalLink)}" target="_blank" rel="noopener">
              ↗ ${t('readOriginal')}
            </a>
          ` : ''}
        </div>
      </div>`;

    document.getElementById('back-btn').onclick = () => {
      stopSpeaking();
      navigate('/');
    };

    document.querySelectorAll('[data-action]').forEach((btn) => {
      btn.onclick = () => handleAction(btn.dataset.action);
    });

    document.getElementById('toggle-read-more')?.addEventListener('click', () => {
      ui.showFull = !ui.showFull;
      render();
    });

    document.querySelectorAll('[data-bias]').forEach((btn) => {
      btn.onclick = () => { ui.biasSide = btn.dataset.bias; render(); };
    });

    document.getElementById('bias-feedback').onclick = async () => {
      try {
        if (ui.userMarkedBiased) {
          const res = await newsApi.unmarkBiased(storyId);
          ui.biasedCount = res.data.data.biasedCount;
          ui.userMarkedBiased = false;
        } else {
          const res = await newsApi.markBiased(storyId);
          ui.biasedCount = res.data.data.biasedCount;
          ui.userMarkedBiased = true;
        }
        render();
      } catch {
        alert(t('feedbackError'));
      }
    };

    const input = document.getElementById('comment-input');
    input.oninput = () => { ui.commentText = input.value; };
    document.getElementById('post-comment').onclick = async () => {
      const text = input.value.trim();
      if (!text) return;
      ui.postingComment = true;
      render();
      try {
        const res = await newsApi.addComment(storyId, text);
        ui.comments.unshift(res.data.data);
        ui.commentText = '';
      } catch {
        alert(t('commentPostError'));
      } finally {
        ui.postingComment = false;
        render();
      }
    };
  };

  Promise.all([
    newsApi.getComments(storyId).catch(() => ({ data: { data: [] } })),
    newsApi.getEngagement(storyId).catch(() => ({ data: { data: { biasedCount: 0, userMarked: false } } })),
  ]).then(([commentsRes, engagementRes]) => {
    ui.comments = commentsRes.data.data;
    ui.biasedCount = engagementRes.data.data.biasedCount;
    ui.userMarkedBiased = engagementRes.data.data.userMarked;
    ui.loadingEngagement = false;
    render();
  });

  loadDeepDive();
  refreshBiasTranslation();

  render();
}
