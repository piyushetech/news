import { authApi } from '../api.js';
import { persistUser, needsPreferences, hydrateUserFromStorage } from '../state.js';
import { navigate } from '../router.js';
import { shouldGateBriefing } from './briefing.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

async function handleLogin(idToken) {
  const res = await authApi.googleLogin(idToken);
  localStorage.setItem('token', res.data.data.token);
  persistUser(res.data.data.user);
  if (needsPreferences()) navigate('/preferences');
  else if (shouldGateBriefing()) navigate('/briefing');
  else navigate('/');
}

export function renderLogin(app) {
  const showDev = import.meta.env.DEV;

  app.innerHTML = `
    <div class="login-page">
      <header class="login-header">
        <h1 class="login-logo">BriefNews</h1>
        <p class="login-tagline">News in 60 words.<br>The crux, not the clutter.</p>
      </header>
      <div class="login-body">
        <div class="login-preview">
          <span class="login-preview-badge">Technology</span>
          <h2>Sample headline preview</h2>
          <p>Your daily stories appear here — headline, 60-word crux, and the original link.</p>
        </div>
        <div id="google-btn" class="google-btn-wrap"></div>
        ${showDev ? `
          <button type="button" class="google-login-btn" id="dev-login">
            <img src="https://www.google.com/favicon.ico" alt="" width="22" height="22" />
            <span>Continue with Google</span>
          </button>
        ` : ''}
        <p class="login-note">Mobile OTP login coming soon</p>
      </div>
    </div>`;

  if (showDev) {
    document.getElementById('dev-login').onclick = () => handleLogin('dev-mock-token').catch(showError);
  }

  initGoogleButton();
}

function showError(err) {
  alert(err.response?.data?.message || err.message || 'Login failed');
}

function initGoogleButton() {
  const wrap = document.getElementById('google-btn');
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('your-google')) {
    if (!import.meta.env.DEV) {
      wrap.innerHTML = '<p class="login-hint">Set VITE_GOOGLE_CLIENT_ID in web/.env for Google Sign-In</p>';
    }
    return;
  }

  const tryInit = () => {
    if (!window.google?.accounts?.id) {
      setTimeout(tryInit, 200);
      return;
    }
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (resp) => handleLogin(resp.credential).catch(showError),
    });
    window.google.accounts.id.renderButton(wrap, {
      theme: 'outline',
      size: 'large',
      width: 320,
      text: 'continue_with',
    });
  };
  tryInit();
}

/** Token check only — never calls GET /auth/me. */
export async function ensureAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    navigate('/login');
    return false;
  }
  if (hydrateUserFromStorage()) return true;
  localStorage.removeItem('token');
  navigate('/login');
  return false;
}

export function logout() {
  localStorage.removeItem('token');
  persistUser(null);
  navigate('/login');
}
