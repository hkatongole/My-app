/**
 * login.js — Login page
 *
 * Renders a sign-in form supporting:
 *  - Email + password
 *  - Magic link (passwordless) — recommended for admin access
 *
 * In local SQLite mode (USE_SUPABASE=false), shows a clear message that auth
 * is not available without Supabase configured, rather than silently failing.
 */

import { authService } from '../auth/authService.js';
import { USE_SUPABASE } from '../db/supabaseConfig.js';

export async function renderLogin({ query = {} } = {}) {
  // Already logged in? Redirect to admin
  if (authService.isLoggedIn) {
    window.location.hash = '#/admin';
    return '';
  }

  if (!USE_SUPABASE) {
    return `
      <section class="page page--login">
        <div class="login-container">
          <div class="login-card">
            <div class="login-card__brand">
              <span class="app-header__mark" style="width:48px;height:48px;font-size:20px">+1</span>
            </div>
            <h1>Authentication</h1>
            <div class="login-notice login-notice--warning">
              <i data-lucide="alert-circle"></i>
              <div>
                <strong>Supabase not configured</strong>
                <p>Login and subscriptions require a connected Supabase project. Edit <code>supabaseConfig.js</code> with your project URL and API key to enable real authentication.</p>
              </div>
            </div>
            <a href="#/" class="login-back-link" style="margin-top:20px">&larr; Back to Home</a>
          </div>
        </div>
      </section>
    `;
  }

  const redirected = query.from || '';
  const magicSent  = query.magic === 'sent';

  if (magicSent) {
    return `
      <section class="page page--login">
        <div class="login-container">
          <div class="login-card">
            <div class="login-card__brand">
              <span class="app-header__mark" style="width:48px;height:48px;font-size:20px">+1</span>
            </div>
            <h1>Check your email</h1>
            <div class="login-notice login-notice--success">
              <i data-lucide="check-circle-2"></i>
              <div>
                <strong>Magic link sent!</strong>
                <p>Click the link in your email to sign in. You can close this tab.</p>
              </div>
            </div>
            <a href="#/login" class="login-back-link">&larr; Back to Login</a>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="page page--login">
      <div class="login-container">
        <div class="login-card">
          <div class="login-card__brand">
            <span class="app-header__mark" style="width:48px;height:48px;font-size:20px">+1</span>
            <span style="font-family:var(--font-display);font-weight:700;font-size:18px;">PlusOne Analytics</span>
          </div>

          <h1>Sign In</h1>
          <p class="login-subtitle">Admin access to database management tools.</p>

          ${redirected === 'admin' ? `
            <div class="login-notice login-notice--info">
              <i data-lucide="info"></i>
              <span>Sign in to access the Admin Panel.</span>
            </div>` : ''}

          <div id="login-error" class="login-notice login-notice--error" style="display:none">
            <i data-lucide="x-circle"></i>
            <span id="login-error-msg"></span>
          </div>

          <!-- Password form -->
          <form id="login-password-form" class="login-form">
            <label class="login-label">
              Email address
              <input type="email" id="login-email" name="email" class="login-input" placeholder="you@example.com" autocomplete="email" required />
            </label>
            <label class="login-label">
              Password
              <input type="password" id="login-password" name="password" class="login-input" placeholder="••••••••" autocomplete="current-password" required />
            </label>
            <button type="submit" class="login-btn" id="login-submit-btn">Sign In</button>
          </form>

          <div class="login-divider"><span>or</span></div>

          <!-- Magic link form -->
          <form id="login-magic-form" class="login-form">
            <label class="login-label">
              Passwordless magic link
              <input type="email" id="login-magic-email" name="email" class="login-input" placeholder="you@example.com" autocomplete="email" required />
            </label>
            <button type="submit" class="login-btn login-btn--secondary" id="login-magic-btn">Send Magic Link</button>
          </form>

          <p class="login-footer-note">Only authorized accounts can access the admin panel. Contact the project administrator if you need access.</p>
        </div>
      </div>
    </section>
  `;
}
