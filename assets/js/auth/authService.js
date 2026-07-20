/**
 * authService.js
 *
 * Supabase Auth wrapper for PlusOne Analytics.
 *
 * Handles:
 *  - Email/password sign-in and sign-up
 *  - Magic link (passwordless) sign-in
 *  - Sign-out
 *  - Session persistence via localStorage (Supabase default)
 *  - Current user / session access
 *
 * Design rules:
 *  - Never imports UI code.
 *  - Works in both USE_SUPABASE=true (full auth) and USE_SUPABASE=false
 *    (local SQLite mode — auth is disabled, admin panel shows local stats).
 *  - Uses Supabase REST Auth API directly (no Supabase JS SDK needed).
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY, USE_SUPABASE } from '../db/supabaseConfig.js';

const AUTH_BASE = `${SUPABASE_URL}/auth/v1`;
const SESSION_KEY = 'plusone_auth_session';

/** In-memory session cache */
let _session = null;

/**
 * Raw auth fetch helper.
 */
async function _authFetch(path, options = {}) {
  const res = await fetch(`${AUTH_BASE}${path}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error_description || data?.msg || `Auth error ${res.status}`);
  }
  return data;
}

/**
 * Persist session to localStorage.
 */
function _saveSession(session) {
  _session = session;
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

/**
 * Load session from localStorage on boot.
 */
function _loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // Check not expired (expires_at is a Unix timestamp in seconds)
    if (s.expires_at && Date.now() / 1000 > s.expires_at) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

class AuthService {
  constructor() {
    _session = _loadSession();
  }

  _getSession() {
    return _session;
  }

  /** True if a valid session exists. */
  get isLoggedIn() {
    return !!this.accessToken;
  }

  /** Current user object or null. */
  get user() {
    const session = this._getSession();
    return session ? session.user : null;
  }

  /** Current access token or null. */
  get accessToken() {
    return _session?.access_token ?? null;
  }

  /** Is the current user an admin? Checks user_metadata.role or app_metadata.role. */
  get isAdmin() {
    const session = this._getSession();
    if (!session?.user) return false;
    const meta = session.user.user_metadata || {};
    return meta.role === 'admin';
  }

  /**
   * Sign in with email + password.
   * @returns {Promise<{user, session}>}
   */
  async signInWithPassword(email, password) {
    if (!USE_SUPABASE) throw new Error('Auth requires Supabase mode. Configure supabaseConfig.js first.');
    const data = await _authFetch('/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    _saveSession(data);
    return data;
  }

  /**
   * Send a magic link (passwordless) to an email address.
   * The user clicks the link → lands on the app → session is established via the URL hash.
   */
  async sendMagicLink(email) {
    if (!USE_SUPABASE) throw new Error('Auth requires Supabase mode. Configure supabaseConfig.js first.');
    await _authFetch('/magiclink', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Sign up a new user with email + password.
   */
  async signUp(email, password) {
    if (!USE_SUPABASE) throw new Error('Auth requires Supabase mode. Configure supabaseConfig.js first.');
    const data = await _authFetch('/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    // Supabase may or may not auto-login on signup depending on email confirm settings
    if (data.access_token) _saveSession(data);
    return data;
  }

  /**
   * Sign out — revoke the session on the server and clear local storage.
   */
  async signOut() {
    if (_session?.access_token) {
      try {
        await _authFetch('/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${_session.access_token}` },
        });
      } catch {
        // If the server-side logout fails (e.g. token already expired), still clear locally
      }
    }
    _saveSession(null);
  }

  /**
   * Handle the auth callback from a magic link URL hash.
   * Call this on every page load — it detects the #access_token=... fragment
   * that Supabase appends when a user clicks a magic link.
   * @returns {boolean} true if a new session was established from the URL
   */
  handleHashCallback() {
    const hash = window.location.hash;
    if (!hash.includes('access_token=')) return false;
    try {
      // Parse the fragment as query params (Supabase format: #access_token=...&expires_in=...&...)
      const params = new URLSearchParams(hash.slice(1));
      const access_token  = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const expires_in    = params.get('expires_in');
      const token_type    = params.get('token_type');
      if (!access_token) return false;

      // Decode the user from the JWT payload (base64)
      const payload = JSON.parse(atob(access_token.split('.')[1]));
      const session = {
        access_token,
        refresh_token,
        token_type,
        expires_at: payload.exp,
        user: { id: payload.sub, email: payload.email, app_metadata: payload.app_metadata ?? {}, user_metadata: payload.user_metadata ?? {} },
      };
      _saveSession(session);
      // Strip the token from the URL so it doesn't get shared accidentally
      window.history.replaceState(null, '', window.location.pathname);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the auth header object for authenticated Supabase requests.
   * Pages/adapters that need to make authenticated requests use this.
   */
  getAuthHeaders() {
    if (!_session?.access_token) return {};
    return { 'Authorization': `Bearer ${_session.access_token}` };
  }
}

export const authService = new AuthService();
