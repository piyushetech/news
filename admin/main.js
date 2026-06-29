import axios from 'axios';

const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const API = rawApi.endsWith('/api') ? rawApi : `${rawApi.replace(/\/$/, '')}/api`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const app = document.getElementById('app');
let currentTab = 'pending';
let currentCategoryFilter = 'all';

const CATEGORIES = [
  'Politics', 'Cricket', 'History', 'World', 'Technology', 'Business',
  'Sports', 'Science', 'Entertainment', 'Crime', 'Current Affairs', 'National', 'City', 'General',
];

const CRUX_MAX_WORDS = 120;
const CRUX_SOFT_WORDS = 60;

const categoryOptionsHtml = (selected = 'General') =>
  CATEGORIES.map((c) => `<option ${c === selected ? 'selected' : ''}>${c}</option>`).join('');

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const countWords = (text = '') => text.trim().split(/\s+/).filter(Boolean).length;

const isWeakCrux = (paragraph, heading) => {
  if (!paragraph || !paragraph.trim()) return true;
  if (paragraph.trim() === heading.trim()) return true;
  return countWords(paragraph) < 12;
};

function storyCruxBlock(n, editable = false) {
  const words = countWords(n.paragraph);
  const weak = isWeakCrux(n.paragraph, n.heading);
  const text = n.paragraph?.trim()
    ? escapeHtml(n.paragraph)
    : '<em>No summary text yet. Edit the crux before approving.</em>';
  const overSoft = words > CRUX_SOFT_WORDS;

  return `
    <div class="story-crux ${weak ? 'story-crux--warn' : ''}" data-crux-id="${n._id}">
      <div class="story-crux-label">Crux · ${words} / ${CRUX_MAX_WORDS} words${overSoft ? ' · extended' : ''}</div>
      <p class="story-crux-text">${text}</p>
      ${editable ? `
        <textarea class="story-crux-edit hidden" data-edit-id="${n._id}" rows="5" placeholder="Write the story crux (up to ${CRUX_MAX_WORDS} words). Users see this in the app.">${escapeHtml(n.paragraph || '')}</textarea>
        <div class="crux-word-hint hidden" data-hint-id="${n._id}">${words} / ${CRUX_MAX_WORDS} words</div>
        <div class="crux-actions">
          <button type="button" class="btn btn-sm btn-outline edit-crux-btn" data-id="${n._id}">Edit crux</button>
          <button type="button" class="btn btn-sm btn-primary hidden save-crux-btn" data-id="${n._id}">Save crux</button>
          <button type="button" class="btn btn-sm btn-outline hidden cancel-crux-btn" data-id="${n._id}">Cancel</button>
        </div>
        <p class="crux-saved hidden" data-saved-id="${n._id}">✓ Crux saved</p>
      ` : ''}
    </div>`;
}

function storyCard(n, actions = '', editableCrux = false) {
  const img = n.imageUrl
    ? `<img class="story-thumb" src="${escapeHtml(n.imageUrl)}" alt="" onerror="this.style.display='none'" />`
    : '';
  const engineBadge = n.scrapedBy === 'python'
    ? '<span class="badge badge-python">🐍 Python AI</span>'
    : n.isAutomated
      ? '<span class="badge badge-auto">Auto</span>'
      : '';
  const aiMeta = n.ai?.qualityScore != null
    ? `<div class="ai-meta">
        <span class="ai-chip">Quality ${Math.round(n.ai.qualityScore * 100)}%</span>
        ${n.ai.sentiment ? `<span class="ai-chip ai-${n.ai.sentiment}">${n.ai.sentiment}</span>` : ''}
        ${n.ai.clickbaitScore > 0.5 ? '<span class="ai-chip ai-warn">clickbait?</span>' : ''}
      </div>`
    : '';
  return `
    <div class="news-item" data-id="${n._id}">
      <div class="news-item-header">
        <div class="news-item-body">
          ${img}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
            <span class="badge badge-cat">${escapeHtml(n.category)}</span>
            <span class="badge ${n.status === 'pending' ? 'badge-pending' : n.status === 'approved' ? 'badge-ok' : 'badge-reject'}">${n.status}</span>
            ${engineBadge}
          </div>
          ${aiMeta}
          <h4>${escapeHtml(n.heading)}</h4>
          ${storyCruxBlock(n, editableCrux)}
          ${n.originalLink ? `<a href="${escapeHtml(n.originalLink)}" target="_blank" rel="noopener" class="link">Original source ↗</a>` : ''}
          <div class="news-meta">${escapeHtml(n.source)} · ${new Date(n.publishedAt || n.createdAt).toLocaleString()}</div>
        </div>
        ${actions ? `<div class="news-actions">${actions}</div>` : ''}
      </div>
    </div>`;
}

function bindCruxEditors(container) {
  container.querySelectorAll('.edit-crux-btn').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const block = container.querySelector(`[data-crux-id="${id}"]`);
      block.querySelector('.story-crux-text').classList.add('hidden');
      const textarea = block.querySelector('.story-crux-edit');
      textarea.classList.remove('hidden');
      block.querySelector('.save-crux-btn').classList.remove('hidden');
      block.querySelector('.cancel-crux-btn').classList.remove('hidden');
      block.querySelector(`[data-hint-id="${id}"]`)?.classList.remove('hidden');
      block.querySelector(`[data-saved-id="${id}"]`)?.classList.add('hidden');
      btn.classList.add('hidden');
      textarea.focus();
    };
  });

  container.querySelectorAll('.story-crux-edit').forEach((textarea) => {
    const id = textarea.dataset.editId;
    const hint = container.querySelector(`[data-hint-id="${id}"]`);
    const updateHint = () => {
      const words = countWords(textarea.value);
      if (hint) {
        hint.textContent = `${words} / ${CRUX_MAX_WORDS} words`;
        hint.className = `crux-word-hint ${words > CRUX_MAX_WORDS ? 'crux-word-hint--warn' : ''}`;
      }
    };
    textarea.addEventListener('input', updateHint);
  });

  container.querySelectorAll('.cancel-crux-btn').forEach((btn) => {
    btn.onclick = () => renderDashboard();
  });

  container.querySelectorAll('.save-crux-btn').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const block = container.querySelector(`[data-crux-id="${id}"]`);
      const textarea = container.querySelector(`textarea[data-edit-id="${id}"]`);
      const paragraph = textarea.value.trim();
      if (!paragraph) {
        alert('Crux text cannot be empty.');
        return;
      }
      const words = countWords(paragraph);
      if (words > CRUX_MAX_WORDS) {
        alert(`Crux is ${words} words. Please keep it within ${CRUX_MAX_WORDS} words.`);
        return;
      }
      btn.disabled = true;
      try {
        const payload = { paragraph };
        if (words > CRUX_SOFT_WORDS) payload.fullContent = paragraph;
        const { data } = await api.patch(`/admin/news/${id}`, payload);
        const saved = data.data;
        block.querySelector('.story-crux-label').textContent =
          `Crux · ${countWords(saved.paragraph)} / ${CRUX_MAX_WORDS} words${countWords(saved.paragraph) > CRUX_SOFT_WORDS ? ' · extended' : ''}`;
        block.querySelector('.story-crux-text').innerHTML = escapeHtml(saved.paragraph);
        block.querySelector('.story-crux-text').classList.remove('hidden');
        textarea.classList.add('hidden');
        block.querySelector(`[data-hint-id="${id}"]`)?.classList.add('hidden');
        block.querySelector('.save-crux-btn').classList.add('hidden');
        block.querySelector('.cancel-crux-btn').classList.add('hidden');
        block.querySelector('.edit-crux-btn').classList.remove('hidden');
        block.querySelector(`[data-saved-id="${id}"]`)?.classList.remove('hidden');
        block.classList.toggle('story-crux--warn', isWeakCrux(saved.paragraph, saved.heading));
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to save crux');
      } finally {
        btn.disabled = false;
      }
    };
  });
}

function categoryFilterBar(active = 'all', onChange) {
  const chips = ['all', ...CATEGORIES].map((cat) => `
    <button type="button" class="filter-chip ${active === cat ? 'filter-chip--active' : ''}" data-cat="${cat}">
      ${cat === 'all' ? 'All' : cat}
    </button>`).join('');

  return `<div class="filter-bar" id="category-filter">${chips}</div>`;
}

function bindCategoryFilter(container, callback) {
  container.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.onclick = () => {
      currentCategoryFilter = chip.dataset.cat;
      callback();
    };
  });
}

function renderCategoryStats(stats) {
  if (!stats?.categoryStats?.length) return '';
  return `
    <div class="category-stats">
      ${stats.categoryStats.map((c) => `
        <div class="cat-stat" data-cat="${escapeHtml(c._id || 'General')}">
          <div class="cat-stat-name">${escapeHtml(c._id || 'General')}</div>
          <div class="cat-stat-row">
            <span class="cat-stat-num">${c.approved}</span> live
            <span class="cat-stat-dot">·</span>
            <span>${c.pending} pending</span>
          </div>
        </div>`).join('')}
    </div>`;
}

function bindWordCounter() {
  const textarea = document.getElementById('paragraph');
  const counter = document.getElementById('word-counter');
  if (!textarea || !counter) return;

  const update = () => {
    const words = countWords(textarea.value);
    counter.textContent = `${words} / ${CRUX_MAX_WORDS} words`;
    counter.className = `word-counter ${words >= 30 && words <= CRUX_MAX_WORDS ? 'ok' : 'warn'}`;
  };

  textarea.addEventListener('input', update);
  update();
}

function renderLogin() {
  app.innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <div class="login-header">
          <h1>BriefNews Admin</h1>
          <p>Review automated stories before they go live</p>
        </div>
        <div id="login-alert"></div>
        <label>Email</label>
        <input type="email" id="email" value="admin@inshort.com" />
        <label>Password</label>
        <input type="password" id="password" value="Admin@123456" />
        <button class="btn" id="login-btn">Sign In</button>
      </div>
    </div>`;

  document.getElementById('login-btn').onclick = async () => {
    try {
      const { data } = await api.post('/admin/login', {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      });
      localStorage.setItem('adminToken', data.data.token);
      renderDashboard();
    } catch (err) {
      document.getElementById('login-alert').innerHTML =
        `<div class="alert alert-error">${err.response?.data?.message || 'Login failed'}</div>`;
    }
  };
}

async function renderDashboard() {
  let stats = { totalNews: 0, todayNews: 0, totalUsers: 0, pendingNews: 0, approvedNews: 0, categoryStats: [] };
  let newsList = [];
  let pendingList = [];
  let systemHealth = { pythonEnabled: false, python: false, node: 'ok' };

  try {
    const newsParams = currentCategoryFilter !== 'all' ? { category: currentCategoryFilter } : {};
    const [statsRes, newsRes, pendingRes, healthRes] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/news', { params: newsParams }),
      api.get('/admin/news/pending'),
      api.get('/admin/system-health').catch(() => ({ data: { data: systemHealth } })),
    ]);
    stats = statsRes.data.data;
    newsList = newsRes.data.data;
    pendingList = pendingRes.data.data;
    systemHealth = healthRes.data.data || systemHealth;
    if (currentCategoryFilter !== 'all') {
      pendingList = pendingList.filter((n) => n.category === currentCategoryFilter);
    }
  } catch {
    localStorage.removeItem('adminToken');
    return renderLogin();
  }

  const pythonOnline = systemHealth.pythonEnabled && systemHealth.python;
  const pythonBanner = systemHealth.pythonEnabled
    ? pythonOnline
      ? '<div class="python-banner python-banner--ok">🐍 Python AI service is <strong>online</strong> — Auto Fetch uses AI enrichment (summary, sentiment, quality score)</div>'
      : '<div class="python-banner python-banner--warn">⚠️ Python is enabled but <strong>offline</strong> — start it with <code>python -m uvicorn app.main:app --port 8000</code> in python-service folder. Falling back to Node scraper.</div>'
    : '<div class="python-banner python-banner--info">ℹ️ Python disabled — set PYTHON_SERVICE_ENABLED=true in backend/.env and restart backend.</div>';

  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <h2>BriefNews</h2>
        <div class="sidebar-status ${pythonOnline ? 'sidebar-status--ok' : 'sidebar-status--warn'}">
          ${pythonOnline ? '🐍 Python AI online' : '📦 Node scraper only'}
        </div>
        <div class="nav-item ${currentTab === 'pending' ? 'active' : ''}" data-tab="pending">⏳ Pending (${stats.pendingNews})</div>
        <div class="nav-item ${currentTab === 'add' ? 'active' : ''}" data-tab="add">➕ Manual Add</div>
        <div class="nav-item ${currentTab === 'list' ? 'active' : ''}" data-tab="list">📰 All Stories</div>
        <div class="nav-item ${currentTab === 'scrape' ? 'active' : ''}" data-tab="scrape">🤖 Auto Fetch</div>
        <div class="nav-item" id="logout">🚪 Logout</div>
      </aside>
      <main class="main">
        <h1 class="page-title">BriefNews Dashboard</h1>
        ${pythonBanner}
        <div class="stats">
          <div class="stat-card"><div class="num">${stats.pendingNews}</div><div class="lbl">Pending Review</div></div>
          <div class="stat-card"><div class="num">${stats.approvedNews}</div><div class="lbl">Live on App</div></div>
          <div class="stat-card"><div class="num">${stats.totalNews}</div><div class="lbl">Total Stories</div></div>
          <div class="stat-card"><div class="num">${stats.totalUsers}</div><div class="lbl">App Users</div></div>
        </div>
        <div id="tab-content"></div>
        ${renderCategoryStats(stats)}
      </main>
    </div>`;

  document.querySelectorAll('.nav-item[data-tab]').forEach((el) => {
    el.onclick = () => { currentTab = el.dataset.tab; renderDashboard(); };
  });
  document.getElementById('logout').onclick = () => {
    localStorage.removeItem('adminToken');
    renderLogin();
  };

  document.querySelectorAll('.cat-stat').forEach((el) => {
    el.onclick = () => {
      currentCategoryFilter = el.dataset.cat;
      currentTab = 'list';
      renderDashboard();
    };
  });

  const tab = document.getElementById('tab-content');

  if (currentTab === 'pending') {
    tab.innerHTML = `
      <div class="card">
        <h3>Automated Stories — Awaiting Approval</h3>
        <p class="hint">Only approved stories appear in the BriefNews mobile app.</p>
        ${categoryFilterBar(currentCategoryFilter)}
        <div id="pending-list"></div>
      </div>`;
    bindCategoryFilter(tab, renderDashboard);
    const list = document.getElementById('pending-list');
    if (!pendingList.length) {
      list.innerHTML = '<p style="color:var(--muted)">No pending stories. Run Auto Fetch to scrape news.</p>';
    } else {
      list.innerHTML = pendingList.map((n) => storyCard(n, `
        <button class="btn btn-sm btn-ok approve-btn" data-id="${n._id}">Approve</button>
        <button class="btn btn-sm btn-danger reject-btn" data-id="${n._id}">Reject</button>
      `, true)).join('');
      bindCruxEditors(list);
      list.querySelectorAll('.approve-btn').forEach((btn) => {
        btn.onclick = async () => {
          await api.patch(`/admin/news/${btn.dataset.id}/approve`, { sendNotification: true });
          renderDashboard();
        };
      });
      list.querySelectorAll('.reject-btn').forEach((btn) => {
        btn.onclick = async () => {
          await api.patch(`/admin/news/${btn.dataset.id}/reject`);
          renderDashboard();
        };
      });
    }
  } else if (currentTab === 'add') {
    tab.innerHTML = `
      <div class="card">
        <h3>Publish Manual Story (auto-approved)</h3>
        <div id="form-alert"></div>
        <label>Heading</label>
        <input type="text" id="heading" placeholder="Short, punchy headline..." maxlength="200" />
        <label>Crux (short summary)</label>
        <textarea id="paragraph" rows="6" placeholder="Write the story crux — aim for ~60 words, up to 120 allowed. This is what users read in the app."></textarea>
        <div id="word-counter" class="word-counter">0 / ${CRUX_MAX_WORDS} words</div>
        <label>Extended summary (optional — for Read more)</label>
        <textarea id="fullContent" rows="4" placeholder="Optional longer text. If empty and crux exceeds 60 words, the crux is used for Read more too."></textarea>
        <label>Original Link</label>
        <input type="url" id="originalLink" placeholder="https://..." />
        <label>Category</label>
        <select id="category">${categoryOptionsHtml()}</select>
        <label>Source</label>
        <input type="text" id="source" value="BriefNews" />
        <div class="checkbox-row">
          <input type="checkbox" id="notify" checked />
          <label for="notify" style="margin:0">Send push notification</label>
        </div>
        <div class="checkbox-row">
          <input type="checkbox" id="breaking" />
          <label for="breaking" style="margin:0">🚨 Breaking news (urgent push)</label>
        </div>
        <button class="btn" id="publish-btn">Publish Story</button>
      </div>`;
    bindWordCounter();
    document.getElementById('publish-btn').onclick = publishNews;
  } else if (currentTab === 'scrape') {
    let scrapeOptions = { categories: CATEGORIES, cities: ['National'], countries: ['IN', 'INT'], languages: ['en'] };
    try {
      const optsRes = await api.get('/admin/scrape-options');
      scrapeOptions = optsRes.data.data;
    } catch { /* use defaults */ }

    const cityOptions = (scrapeOptions.cities || []).map(
      (c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
    ).join('');
    const countryOptions = (scrapeOptions.countries || ['IN', 'INT']).map(
      (c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
    ).join('');
    const langOptions = (scrapeOptions.languages || ['en']).map(
      (c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
    ).join('');

    tab.innerHTML = `
      <div class="card">
        <h3>Fetch News Automatically</h3>
        <p class="hint">Pick filters to scrape only what you need. With Python online, stories get AI summary, sentiment &amp; quality scores before landing in Pending.</p>
        <div class="engine-pill ${pythonOnline ? 'engine-pill--python' : 'engine-pill--node'}">
          Active engine: <strong>${pythonOnline ? 'Python AI + RSS' : 'Node.js RSS'}</strong>
        </div>
        <div class="scrape-filters">
          <div class="filter-field">
            <label>Category</label>
            <select id="scrape-category">
              <option value="">All categories</option>
              ${categoryOptionsHtml()}
            </select>
          </div>
          <div class="filter-field">
            <label>City</label>
            <select id="scrape-city">
              <option value="">All cities</option>
              ${cityOptions}
            </select>
          </div>
          <div class="filter-field">
            <label>Country</label>
            <select id="scrape-country">
              <option value="">All countries</option>
              ${countryOptions}
            </select>
          </div>
          <div class="filter-field">
            <label>Source language</label>
            <select id="scrape-language">
              <option value="">Any language</option>
              ${langOptions}
            </select>
          </div>
        </div>
        <div id="scrape-alert"></div>
        <div class="cron-box">
          <strong>⏰ Hourly cron</strong> — backend auto-scrapes all feeds every hour (pending review).
          <button type="button" class="btn btn-sm btn-outline" id="cron-run-btn" style="margin-top:10px">Run cron scrape now</button>
          <div id="cron-jobs" class="cron-jobs"></div>
        </div>
        <button class="btn" id="scrape-btn">Run Filtered Auto Fetch</button>
      </div>`;
    api.get('/admin/scraper-jobs').then(({ data }) => {
      const el = document.getElementById('cron-jobs');
      if (!el || !data.data?.length) {
        if (el) el.innerHTML = '<p class="hint" style="margin-top:8px">No scrape jobs logged yet.</p>';
        return;
      }
      el.innerHTML = data.data.slice(0, 3).map((j) => `
        <div class="cron-job">
          ${j.triggeredBy} · ${j.status} · created ${j.created} · ${new Date(j.createdAt).toLocaleString()}
        </div>`).join('');
    }).catch(() => {});
    document.getElementById('cron-run-btn').onclick = async () => {
      const alert = document.getElementById('scrape-alert');
      alert.innerHTML = '<div class="alert">Running full cron scrape…</div>';
      try {
        const { data } = await api.post('/admin/news/scrape/cron');
        const r = data.data;
        alert.innerHTML = `<div class="alert alert-success">Cron done — created ${r.created}, skipped ${r.skipped}, engine ${r.engine || 'node'}</div>`;
        setTimeout(renderDashboard, 1500);
      } catch (err) {
        alert.innerHTML = `<div class="alert alert-error">${err.response?.data?.message || 'Cron failed'}</div>`;
      }
    };
    document.getElementById('scrape-btn').onclick = async () => {
      const alert = document.getElementById('scrape-alert');
      const payload = {};
      const category = document.getElementById('scrape-category').value;
      const city = document.getElementById('scrape-city').value;
      const country = document.getElementById('scrape-country').value;
      const language = document.getElementById('scrape-language').value;
      if (category) payload.category = category;
      if (city) payload.city = city;
      if (country) payload.country = country;
      if (language) payload.language = language;

      alert.innerHTML = '<div class="alert">Fetching news…</div>';
      try {
        const { data } = await api.post('/admin/news/scrape', payload);
        const r = data.data;
        const filterNote = r.feedsMatched != null ? ` (${r.feedsMatched} feeds matched)` : '';
        const engineNote = r.engine === 'python'
          ? ' · Engine: <strong>Python AI</strong> — check Pending for quality/sentiment badges'
          : r.engine === 'node'
            ? ' · Engine: Node.js RSS'
            : '';
        alert.innerHTML = `<div class="alert alert-success">Created ${r.created}, skipped ${r.skipped}${r.repaired ? `, repaired ${r.repaired}` : ''}${filterNote}${engineNote}${r.errors?.length ? `. Notes: ${r.errors.join('; ')}` : ''}</div>`;
        currentTab = 'pending';
        if (category) currentCategoryFilter = category;
        setTimeout(renderDashboard, 1500);
      } catch (err) {
        alert.innerHTML = `<div class="alert alert-error">${err.response?.data?.message || 'Scrape failed'}</div>`;
      }
    };
  } else {
    tab.innerHTML = `
      <div class="card">
        <h3>All Stories (${newsList.length})</h3>
        ${categoryFilterBar(currentCategoryFilter)}
        <div class="news-list" id="news-list"></div>
      </div>`;
    bindCategoryFilter(tab, renderDashboard);
    const list = document.getElementById('news-list');
    list.innerHTML = newsList.length
      ? newsList.map((n) => storyCard(n, `
          ${n.status === 'pending' ? `<button class="btn btn-sm btn-ok approve-btn" data-id="${n._id}">Approve</button>` : ''}
          <button class="btn btn-sm btn-danger delete-btn" data-id="${n._id}">Delete</button>
        `, true)).join('')
      : '<p style="color:var(--muted)">No stories yet.</p>';

    bindCruxEditors(list);

    list.querySelectorAll('.approve-btn').forEach((btn) => {
      btn.onclick = async () => {
        await api.patch(`/admin/news/${btn.dataset.id}/approve`);
        renderDashboard();
      };
    });
    list.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm('Delete this story?')) return;
        await api.delete(`/admin/news/${btn.dataset.id}`);
        renderDashboard();
      };
    });
  }
}

async function publishNews() {
  const heading = document.getElementById('heading').value.trim();
  const paragraph = document.getElementById('paragraph').value.trim();
  const fullContent = document.getElementById('fullContent')?.value.trim();
  const alert = document.getElementById('form-alert');

  if (!heading || !paragraph) {
    alert.innerHTML = '<div class="alert alert-error">Heading and crux are required.</div>';
    return;
  }
  const words = countWords(paragraph);
  if (words > CRUX_MAX_WORDS) {
    alert.innerHTML = `<div class="alert alert-error">Crux is ${words} words. Maximum is ${CRUX_MAX_WORDS}.</div>`;
    return;
  }

  try {
    await api.post('/admin/news', {
      heading,
      paragraph,
      ...(fullContent ? { fullContent } : words > CRUX_SOFT_WORDS ? { fullContent: paragraph } : {}),
      originalLink: document.getElementById('originalLink').value.trim() || undefined,
      category: document.getElementById('category').value,
      source: document.getElementById('source').value,
      sendNotification: document.getElementById('notify').checked,
      isBreaking: document.getElementById('breaking')?.checked || false,
    });
    alert.innerHTML = '<div class="alert alert-success">Story published and live on mobile!</div>';
    document.getElementById('heading').value = '';
    document.getElementById('paragraph').value = '';
    document.getElementById('fullContent').value = '';
    document.getElementById('originalLink').value = '';
  } catch (err) {
    alert.innerHTML = `<div class="alert alert-error">${err.response?.data?.message || 'Failed to publish'}</div>`;
  }
}

if (localStorage.getItem('adminToken')) renderDashboard();
else renderLogin();
