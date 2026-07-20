/**
 * admin.js — Admin Panel
 *
 * Protected page — only accessible when logged in (redirects to /login if not).
 * Shows:
 *  1. Overview: DB row counts, scraper health, model meta
 *  2. Customize UI: Live editor for text labels and announcements
 *  3. Users: Supabase user management
 *  4. Usage: Local analytics
 */

import { authService } from '../auth/authService.js';
import { storage } from '../db/storageAdapter.js';
import { db, USE_SUPABASE } from '../db/dbProvider.js';
import { formatDateTime } from '../components/format.js';
import { LABEL_DEFINITIONS, getLabel, loadSettings } from '../admin/uiSettings.js';
import { analytics } from '../admin/analytics.js';
import { listUsers, USER_MGMT_SQL } from '../admin/userManager.js';

export async function renderAdmin({ query = {} } = {}) {
  if (USE_SUPABASE && !authService.isLoggedIn) {
    window.location.hash = '#/login?from=admin';
    return '';
  }

  const user    = authService.user;
  const isAdmin = authService.isAdmin;
  const tab     = query.tab || 'overview';

  const tabsNav = `
    <div class="tab-nav" style="margin-top:var(--space-4)">
      <a href="#/admin?tab=overview" class="tab-nav__item ${tab === 'overview' ? 'tab-nav__item--active' : ''}">Overview</a>
      <a href="#/admin?tab=ui" class="tab-nav__item ${tab === 'ui' ? 'tab-nav__item--active' : ''}">Customize UI</a>
      <a href="#/admin?tab=users" class="tab-nav__item ${tab === 'users' ? 'tab-nav__item--active' : ''}">Users</a>
      <a href="#/admin?tab=usage" class="tab-nav__item ${tab === 'usage' ? 'tab-nav__item--active' : ''}">Usage Stats</a>
    </div>
  `;

  const header = `
    <header class="page__header" style="margin-bottom:0; padding-bottom:0">
      <h1>Admin Panel</h1>
      <p class="page__subtitle">System management &amp; configuration.</p>
      ${tabsNav}
    </header>
  `;

  let contentHtml = '';

  if (tab === 'overview') {
    contentHtml = await renderOverview(user, isAdmin);
  } else if (tab === 'ui') {
    contentHtml = renderUiSettings();
  } else if (tab === 'users') {
    contentHtml = await renderUsers();
  } else if (tab === 'usage') {
    contentHtml = renderUsageStats();
  }

  return `
    <section class="page page--admin">
      ${header}
      <div style="margin-top:var(--space-4)">
        ${contentHtml}
      </div>
    </section>
  `;
}

async function renderOverview(user, isAdmin) {
  let tableStats = [];
  let scraperHealth = [];
  let modelMeta = null;
  let engineWeights = [];

  if (USE_SUPABASE) {
    const summary = db.getSummary();
    tableStats = Object.entries(summary.rowCounts || {})
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    try {
      const { supabaseAdapter } = await import('../db/supabaseAdapter.js');
      scraperHealth = await supabaseAdapter.query('scraper_health', { order: 'last_attempt_at.desc', limit: 50 }).catch(() => []);
      engineWeights = await supabaseAdapter.query('engine_weights', { order: 'computed_at.desc', limit: 5 }).catch(() => []);
      const kvRows = await supabaseAdapter.query('key_value', { conditions: [{ col: 'key', op: 'eq', val: 'model_meta' }], limit: 1 }).catch(() => []);
      if (kvRows[0]?.value) modelMeta = JSON.parse(kvRows[0].value);
    } catch (e) {
      console.warn('Admin overview failed to load some cloud data', e);
    }
  } else {
    if (storage.ready) {
      const allTables = storage.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
      tableStats = allTables.map(({ name }) => {
        try { return { name, count: storage.all(`SELECT COUNT(*) AS n FROM "${name}"`)[0]?.n ?? 0 }; }
        catch { return { name, count: 0 }; }
      }).sort((a, b) => b.count - a.count);
      if (storage.hasTable('scraper_health')) scraperHealth = storage.all('SELECT * FROM scraper_health ORDER BY last_attempt_at DESC LIMIT 50');
      if (storage.hasTable('engine_weights')) engineWeights = storage.all('SELECT * FROM engine_weights ORDER BY computed_at DESC LIMIT 5');
      if (storage.hasTable('key_value')) {
        const kv = storage.get("SELECT value FROM key_value WHERE key='model_meta'");
        if (kv?.value) try { modelMeta = JSON.parse(kv.value); } catch {}
      }
    }
  }

  const totalRows = tableStats.reduce((s, t) => s + t.count, 0);
  const populatedTables = tableStats.filter(t => t.count > 0).length;

  const healthIcon = (row) => {
    if (!row.last_success_at) return `<span class="admin-health-dot admin-health-dot--unknown" title="Never succeeded"></span>`;
    if ((row.consecutive_failures || 0) > 0) return `<span class="admin-health-dot admin-health-dot--warn" title="${row.consecutive_failures} consecutive failures"></span>`;
    return `<span class="admin-health-dot admin-health-dot--ok" title="OK"></span>`;
  };

  const fmtDt = (d) => d ? (formatDateTime(d) || d.replace('T', ' ').slice(0, 16)) : '—';
  const rowBar = (count) => `<div class="admin-row-bar" style="width:${Math.min(100, (count / (tableStats[0]?.count || 1)) * 100)}%"></div>`;

  return `
    <div class="admin-user-card">
      <div class="admin-user-info">
        <div class="admin-user-avatar">${user?.email?.[0]?.toUpperCase() ?? '?'}</div>
        <div>
          <div class="admin-user-email">${user?.email ?? 'Local Mode (no auth)'}</div>
          <div class="admin-user-role">${isAdmin ? '👑 Administrator' : '👁️ Viewer'} &mdash; ${USE_SUPABASE ? 'Cloud (Supabase)' : 'Local SQLite'}</div>
        </div>
      </div>
      ${USE_SUPABASE && authService.isLoggedIn ? `<button class="admin-signout-btn" id="admin-signout-btn">Sign Out</button>` : ''}
    </div>

    <div class="admin-quick-stats">
      <div class="admin-stat-card"><span class="admin-stat-value">${tableStats.length}</span><span class="admin-stat-label">Total Tables</span></div>
      <div class="admin-stat-card"><span class="admin-stat-value">${populatedTables}</span><span class="admin-stat-label">Populated Tables</span></div>
      <div class="admin-stat-card"><span class="admin-stat-value">${(totalRows / 1000).toFixed(1)}K</span><span class="admin-stat-label">Total Rows</span></div>
      <div class="admin-stat-card"><span class="admin-stat-value">${USE_SUPABASE ? 'Cloud' : 'Local'}</span><span class="admin-stat-label">Data Source</span></div>
    </div>

    ${modelMeta ? `
    <div class="panel">
      <h3>ML Model Status</h3>
      <div class="admin-model-grid">
        <div class="admin-model-item"><span class="admin-model-label">Version</span><span class="admin-model-val">${modelMeta.model_version ?? '—'}</span></div>
        <div class="admin-model-item"><span class="admin-model-label">Trained At</span><span class="admin-model-val">${fmtDt(modelMeta.trained_at)}</span></div>
        <div class="admin-model-item"><span class="admin-model-label">Sample Count</span><span class="admin-model-val">${modelMeta.sample_count?.toLocaleString() ?? '—'}</span></div>
        <div class="admin-model-item"><span class="admin-model-label">Epochs</span><span class="admin-model-val">${modelMeta.epochs ?? '—'} / ${modelMeta.epochs_budget ?? '—'}</span></div>
      </div>
    </div>` : ''}

    ${engineWeights.length > 0 ? `
    <div class="panel">
      <h3>Current Engine Weights</h3>
      <div class="table-scroll">
        <table class="data-table data-table--compact">
          <thead><tr><th>Computed At</th><th>Dixon-Coles</th><th>ML Engine</th><th>Legacy</th><th>Sample</th></tr></thead>
          <tbody>
            ${engineWeights.map((w, i) => `
              <tr${i === 0 ? ' class="admin-latest-row"' : ''}>
                <td>${fmtDt(w.computed_at)}</td>
                <td style="color:var(--pitch-teal);font-weight:700">${w.dc_weight != null ? Math.round(w.dc_weight * 100) + '%' : '—'}</td>
                <td style="color:#7C9CFF;font-weight:700">${w.ml_weight != null ? Math.round(w.ml_weight * 100) + '%' : '—'}</td>
                <td style="color:#E07A5F;font-weight:700">${w.legacy_weight != null ? Math.round(w.legacy_weight * 100) + '%' : '—'}</td>
                <td>${w.sample_size?.toLocaleString() ?? '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    <div class="panel">
      <h3>Scraper Health</h3>
      ${scraperHealth.length === 0 ? `<div class="empty-state--inline-note"><p>No scraper health records found.</p></div>` : `
        <div class="table-scroll">
          <table class="data-table data-table--compact">
            <thead><tr><th>Status</th><th>Scraper</th><th>League</th><th>Last Success</th><th>Last Attempt</th><th>Runs</th><th>Failures</th><th>Last Error</th></tr></thead>
            <tbody>
              ${scraperHealth.map(h => `
                <tr>
                  <td>${healthIcon(h)}</td>
                  <td><strong>${h.scraper_name}</strong></td>
                  <td>${h.league ?? '—'}</td>
                  <td>${fmtDt(h.last_success_at)}</td>
                  <td>${fmtDt(h.last_attempt_at)}</td>
                  <td>${h.total_runs ?? 0}</td>
                  <td class="${(h.consecutive_failures || 0) > 0 ? 'admin-health-fail' : ''}">${h.consecutive_failures ?? 0}</td>
                  <td class="admin-error-cell" title="${h.last_error || ''}">${h.last_error ? h.last_error.slice(0, 40) + '…' : '—'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`}
    </div>

    <div class="panel">
      <h3>Database Tables</h3>
      <div class="admin-table-list">
        ${tableStats.map(t => `
          <div class="admin-table-row">
            <span class="admin-table-name${t.count === 0 ? ' admin-table-empty' : ''}">${t.name}</span>
            <div class="admin-row-track">${rowBar(t.count)}</div>
            <span class="admin-table-count${t.count === 0 ? ' admin-table-empty' : ''}">${t.count.toLocaleString()}</span>
          </div>`).join('')}
      </div>
    </div>
  `;
}

function renderUiSettings() {
  loadSettings();

  // Group definitions by category
  const groups = {};
  for (const def of LABEL_DEFINITIONS) {
    if (!groups[def.category]) groups[def.category] = [];
    groups[def.category].push(def);
  }

  let html = `<div class="panel">
    <h3>Customize Text & Labels</h3>
    <p style="color:var(--paper-400);font-size:13px">Change any text across the application. Leave empty to use the default.</p>
    <form id="admin-ui-settings-form">
  `;

  for (const [cat, items] of Object.entries(groups)) {
    html += `<div class="admin-ui-group">
      <h4>${cat}</h4>
      <div class="admin-ui-fields">
    `;
    for (const item of items) {
      const val = getLabel(item.key);
      const isOverride = val !== item.default;
      html += `
        <label class="admin-ui-field">
          <span class="admin-ui-label">${item.description}</span>
          <div class="admin-ui-input-wrap">
            <input type="text" name="${item.key}" value="${isOverride ? val : ''}" placeholder="${item.default}" class="login-input" style="width:100%" />
            ${isOverride ? `<span class="admin-ui-modified-dot" title="Customized"></span>` : ''}
          </div>
        </label>
      `;
    }
    html += `</div></div>`;
  }

  html += `
      <div class="admin-ui-actions">
        <button type="submit" class="login-btn" id="ui-save-btn">Save Changes</button>
        <button type="button" class="login-btn login-btn--secondary" id="ui-reset-btn">Reset All Defaults</button>
      </div>
    </form>
  </div>`;
  return html;
}

async function renderUsers() {
  if (!USE_SUPABASE) {
    return `
      <div class="panel">
        <h3>User Management</h3>
        <div class="login-notice login-notice--warning" style="margin-bottom:var(--space-4)">
          <i data-lucide="alert-circle"></i>
          <div>
            <strong>Cloud Feature</strong>
            <p>User management requires Supabase to be configured and an active admin session.</p>
          </div>
        </div>
      </div>
    `;
  }

  const { users, error } = await listUsers();

  if (error === 'rpc_not_deployed') {
    return `
      <div class="panel">
        <h3>Action Required: Deploy RPC Functions</h3>
        <p>To manage users from this interface, you must first deploy two PostgreSQL functions in your Supabase dashboard (SQL Editor).</p>
        <pre class="admin-code">${USER_MGMT_SQL}</pre>
        <p style="margin-top:var(--space-3);color:var(--paper-400);font-size:13px">After running that SQL, refresh this page.</p>
      </div>
    `;
  }

  if (error) {
    return `
      <div class="panel">
        <h3>User Management</h3>
        <div class="login-notice login-notice--error" style="margin-bottom:var(--space-4)">
          <i data-lucide="x-circle"></i>
          <div>
            <strong>Error fetching users</strong>
            <p>${error}</p>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="panel">
      <h3>Registered Users <span class="panel__count">${users.length} total</span></h3>
      <div class="table-scroll">
        <table class="data-table data-table--compact" id="admin-users-table">
          <thead><tr><th>Email</th><th>Role</th><th>Created</th><th>Last Sign In</th><th>Action</th></tr></thead>
          <tbody>
            ${users.map(u => `
              <tr data-uid="${u.id}" data-role="${u.role}">
                <td><strong>${u.email}</strong></td>
                <td>
                  ${u.role === 'admin' ? '<span class="pill pill--value">Admin</span>' : '<span class="pill">Viewer</span>'}
                </td>
                <td>${formatDateTime(u.created_at) || '—'}</td>
                <td>${formatDateTime(u.last_sign_in_at) || '—'}</td>
                <td>
                  ${u.role === 'admin'
                    ? `<button class="admin-role-btn admin-role-btn--revoke" data-action="viewer">Revoke Admin</button>`
                    : `<button class="admin-role-btn admin-role-btn--grant" data-action="admin">Make Admin</button>`
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderUsageStats() {
  const rep = analytics.getReport();

  return `
    <div class="admin-quick-stats" style="margin-bottom:var(--space-4)">
      <div class="admin-stat-card"><span class="admin-stat-value">${rep.totalPageViews.toLocaleString()}</span><span class="admin-stat-label">Total Page Views</span></div>
      <div class="admin-stat-card"><span class="admin-stat-value">${rep.sessionCount.toLocaleString()}</span><span class="admin-stat-label">Total Sessions</span></div>
      <div class="admin-stat-card"><span class="admin-stat-value">${rep.currentSession.durationMin}m</span><span class="admin-stat-label">Current Session Time</span></div>
    </div>

    <div class="admin-grid-2">
      <div class="panel">
        <h3>Top Pages</h3>
        <div class="table-scroll">
          <table class="data-table data-table--compact">
            <thead><tr><th>Route</th><th>Views</th></tr></thead>
            <tbody>
              ${rep.pages.slice(0, 15).map(p => `
                <tr>
                  <td><code>${p.path}</code></td>
                  <td style="font-weight:700">${p.count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <h3>Top Events</h3>
        ${rep.events.length === 0 ? `<p style="color:var(--paper-400);font-size:13px">No events recorded yet.</p>` : `
          <div class="table-scroll">
            <table class="data-table data-table--compact">
              <thead><tr><th>Event</th><th>Count</th></tr></thead>
              <tbody>
                ${rep.events.map(e => `
                  <tr>
                    <td><strong>${e.name}</strong></td>
                    <td style="font-weight:700">${e.count}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
        <div style="margin-top:var(--space-6)">
          <button class="login-btn login-btn--secondary" id="admin-clear-analytics-btn">Clear All Analytics Data</button>
        </div>
      </div>
    </div>
  `;
}
