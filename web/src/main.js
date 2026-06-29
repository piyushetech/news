import { ensureAuth, renderLogin, logout } from './pages/login.js';
import { renderHome } from './pages/home.js';
import { renderDetail } from './pages/detail.js';
import { renderPreferences, clearPreferencesSession } from './pages/preferences.js';
import { renderBriefing, shouldGateBriefing } from './pages/briefing.js';
import { needsPreferences } from './state.js';
import { getRoute, navigate } from './router.js';

const app = document.getElementById('app');

let routerRunning = false;
let lastPath = null;

async function router() {
  if (routerRunning) return;
  routerRunning = true;
  try {
    await runRouter();
  } finally {
    routerRunning = false;
  }
}

async function runRouter() {
  const { path, params } = getRoute();

  if (lastPath === '/preferences' && path !== '/preferences') {
    clearPreferencesSession();
  }
  lastPath = path;

  if (path === '/login') {
    if (localStorage.getItem('token')) {
      const ok = await ensureAuth();
      if (ok) {
        navigate(needsPreferences() ? '/preferences' : (shouldGateBriefing() ? '/briefing' : '/'));
        return;
      }
    }
    renderLogin(app);
    return;
  }

  const authed = await ensureAuth();
  if (!authed) return;

  if (needsPreferences() && path !== '/preferences') {
    navigate('/preferences');
    return;
  }

  if (path === '/preferences') {
    await renderPreferences(app);
    return;
  }

  if (path === '/briefing') {
    if (!shouldGateBriefing()) {
      navigate('/');
      return;
    }
    await renderBriefing(app);
    return;
  }

  if (path.startsWith('/story/')) {
    const id = path.split('/')[2];
    const scrollToDeepDive = params.deep === '1';
    if (id) await renderDetail(app, id, { scrollToDeepDive });
    else navigate('/');
    return;
  }

  if (path === '/' || path === '/home') {
    if (shouldGateBriefing()) {
      navigate('/briefing');
      return;
    }
    await renderHome(app);
    return;
  }

  navigate('/');
}

window.addEventListener('hashchange', router);
router();

export { logout, navigate };
