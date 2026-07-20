import { db, USE_SUPABASE } from './db/dbProvider.js';
import { storage } from './db/storageAdapter.js';
import { Router } from './router/router.js';
import { renderHome } from './pages/home.js';
import { renderMatchList } from './pages/matchExplorer.js';
import { renderMatchDetail } from './pages/matchDetail.js';
import { renderTeamDirectory } from './pages/teamExplorer.js';
import {
  renderTeamOverview,
  renderTeamFixtures,
  renderTeamResults,
  renderTeamStatistics,
  renderTeamSquad,
  renderTeamPredictions,
  renderTeamOdds,
  renderTeamHistory,
} from './pages/teamDetail.js';
import { renderPlayerDirectory } from './pages/playerExplorer.js';
import {
  renderPlayerOverview,
  renderPlayerStatistics,
  renderPlayerMatches,
  renderPlayerSeasons,
  renderPlayerTeams,
} from './pages/playerDetail.js';
import { renderLeagueDirectory } from './pages/leagueExplorer.js';
import {
  renderLeagueOverview,
  renderLeagueStandings,
  renderLeagueFixtures,
  renderLeagueResults,
  renderLeagueTeams,
  renderLeaguePlayers,
  renderLeagueStatistics,
  renderLeaguePredictions,
  renderLeagueOdds,
  renderLeagueSeasons,
} from './pages/leagueDetail.js';
import { renderPredictionOddsExplorer } from './pages/predictionOddsExplorer.js';
import { renderValueBets } from './pages/valueBets.js';
import { renderModelPerformance } from './pages/modelPerformance.js';
import { renderInjuries } from './pages/injuries.js';
import { renderHowItWorks } from './pages/howItWorks.js';
import { renderTerms } from './pages/terms.js';
import { renderPrivacy } from './pages/privacy.js';
import { renderLogin } from './pages/login.js';
import { renderAdmin } from './pages/admin.js';
import { authService } from './auth/authService.js';
import { applyCustomLabels, saveSettings, resetAllSettings } from './admin/uiSettings.js';
import { userSettings } from './components/userSettings.js';
import { analytics } from './admin/analytics.js';
import { setUserRole } from './admin/userManager.js';
import { predictionRepository  } from './db/repositories.js';
import { oddsRepository  } from './db/repositories.js';
import { toCsv, downloadCsv } from './components/csvExport.js';

// Single application bootstrap namespace (Section 13.9) -- the one allowed global.
window.PlusOne = window.PlusOne || {};

/**
 * Boot-step logging. Kept as plain console output now that devtools console
 * access is available -- the on-screen panel this used to also write to was
 * only needed as a workaround for phone-only debugging without a console.
 */
function logStep(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

window.addEventListener('error', (e) => logStep(`window error: ${e.message}`));
window.addEventListener('unhandledrejection', (e) =>
  logStep(`unhandled rejection: ${e.reason?.message || e.reason}`)
);

/** Never let a single slow/hung step (e.g. a WASM compile stall) freeze the splash forever. */
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms waiting for: ${label}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function boot() {
  logStep('Booting PlusOne Analytics...');
  const outlet = document.getElementById('app-outlet');

  try {
    registerServiceWorker();

    const router = new Router(outlet);
    router
      .register('/', renderHome)
      .register('/matches', renderMatchList)
      .register('/matches/:id', renderMatchDetail)
      .register('/teams', renderTeamDirectory)
      .register('/teams/:team', renderTeamOverview)
      .register('/teams/:team/fixtures', renderTeamFixtures)
      .register('/teams/:team/results', renderTeamResults)
      .register('/teams/:team/statistics', renderTeamStatistics)
      .register('/teams/:team/players', renderTeamSquad)
      .register('/teams/:team/predictions', renderTeamPredictions)
      .register('/teams/:team/odds', renderTeamOdds)
      .register('/teams/:team/history', renderTeamHistory)
      .register('/players', renderPlayerDirectory)
      .register('/players/:player', renderPlayerOverview)
      .register('/players/:player/statistics', renderPlayerStatistics)
      .register('/players/:player/matches', renderPlayerMatches)
      .register('/players/:player/seasons', renderPlayerSeasons)
      .register('/players/:player/teams', renderPlayerTeams)
      .register('/leagues', renderLeagueDirectory)
      .register('/leagues/:league', renderLeagueOverview)
      .register('/leagues/:league/standings', renderLeagueStandings)
      .register('/leagues/:league/fixtures', renderLeagueFixtures)
      .register('/leagues/:league/results', renderLeagueResults)
      .register('/leagues/:league/teams', renderLeagueTeams)
      .register('/leagues/:league/players', renderLeaguePlayers)
      .register('/leagues/:league/statistics', renderLeagueStatistics)
      .register('/leagues/:league/predictions', renderLeaguePredictions)
      .register('/leagues/:league/odds', renderLeagueOdds)
      .register('/leagues/:league/seasons', renderLeagueSeasons)
      .register('/predictions', renderPredictionOddsExplorer)
      .register('/value-bets', renderValueBets)
      .register('/model-performance', renderModelPerformance)
      .register('/injuries', renderInjuries)
      .register('/how-it-works', renderHowItWorks)
      .register('/terms', renderTerms)
      .register('/privacy', renderPrivacy)
      .register('/login', renderLogin)
      .register('/admin', renderAdmin);
    window.PlusOne.router = router;

    logStep(USE_SUPABASE ? 'Initializing Supabase connection...' : 'Initializing sql.js (WASM runtime)...');

    // Handle magic link callback from email (must run before router.start)
    const magicHandled = authService.handleHashCallback();
    if (magicHandled) {
      logStep('Magic link auth callback processed.');
    }
    try {
      if (USE_SUPABASE) {
        await withTimeout(db.init(), 10000, 'Supabase init');
        logStep('Supabase ready.');
      } else {
        await withTimeout(db.init(), 10000, 'sql.js init');
        logStep('sql.js ready.');
        
        logStep('Checking for a previously saved database (OPFS)...');
        let restored = false;
        try {
          restored = await withTimeout(db.restoreFromOPFS(), 6000, 'OPFS restore');
          logStep(restored ? 'Restored a saved database from OPFS.' : 'No saved database found (first run).');
        } catch (err) {
          logStep(`OPFS restore skipped: ${err.message}`);
        }
      }
    } catch (err) {
      logStep(`DB init failed or timed out: ${err.message}`);
    }

    setSplashVisible(false);
    updateFreshnessBadge();
    updateAuthNavState();
    wireDbImport();
    wireAuthEvents();
    wireAdminEvents();
    wireSettingsEvents();
    applyCustomLabels();

    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }

    router.start('/');
    analytics.trackPageView(window.location.hash || '#/');
    updateNavActiveState();

    window.addEventListener('hashchange', () => {
      updateNavActiveState();
      applyCustomLabels();
      analytics.trackPageView(window.location.hash || '#/');
    });
    logStep('App ready.');
  } catch (err) {
    logStep(`Boot failed: ${err.message}`);
    setSplashVisible(false); // never leave the user staring at a spinner forever
    outlet.innerHTML = `
      <div class="empty-state empty-state--error">
        <h2>Something went wrong starting the app</h2>
        <p>${err.message}</p>
        <p>Check the browser console for details.</p>
      </div>`;
  }
}

function setSplashVisible(visible) {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.hidden = !visible;
  splash.style.display = visible ? '' : 'none';
}

function updateFreshnessBadge() {
  const el = document.getElementById('db-status');
  if (!el) return;
  if (db.ready) {
    const summary = db.getSummary();
    const source = summary.source === 'supabase' ? 'Cloud' : 'Local';
    el.textContent = `${source}: ${summary.tables?.length || summary.tables} tables loaded`;
    el.classList.add('db-status--ready');
  } else {
    el.textContent = 'No database loaded';
    el.classList.remove('db-status--ready');
  }
}

function wireDbImport() {
  document.addEventListener('change', async (e) => {
    if (e.target.id !== 'db-file-input') return;
    const file = e.target.files?.[0];
    if (!file) return;
    await handleImport(file);
  });

  // Drag-and-drop anywhere on the app shell (Section 2's import requirement).
  const shell = document.getElementById('app-shell');
  shell.addEventListener('dragover', (e) => e.preventDefault());
  shell.addEventListener('drop', async (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) await handleImport(file);
  });
}

async function handleImport(file) {
  if (USE_SUPABASE) {
    alert("Database imports are disabled in cloud mode. Use the Termux script to update the cloud database.");
    return;
  }
  try {
    setSplashVisible(true);
    logStep(`Importing ${file.name}...`);
    await db.importFile(file);
    logStep('Import complete.');
    updateFreshnessBadge();
    window.PlusOne.router.navigate('/');
  } catch (err) {
    logStep(`Import failed: ${err.message}`);
    alert(err.message || 'Could not load that file.');
  } finally {
    setSplashVisible(false);
  }
}

function updateNavActiveState() {
  const path = (location.hash.slice(1) || '/').split('?')[0];
  document.querySelectorAll('[data-nav]').forEach((el) => {
    const nav = el.getAttribute('data-nav');
    const isActive = nav === '/' ? path === '/' : path === nav || path.startsWith(nav + '/');
    el.classList.toggle('nav-active', isActive);
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch((err) => {
      logStep(`Service worker registration failed (non-fatal): ${err.message}`);
    });
  } else {
    logStep('Service workers not available in this context (may be a non-secure origin).');
  }
}

// Click-through for table rows that carry a data-href (used by Match Explorer).
document.addEventListener('click', (e) => {
  const row = e.target.closest('[data-href]');
  if (row) {
    location.hash = row.getAttribute('data-href');
    return;
  }

  const exportBtn = e.target.closest('[data-export]');
  if (exportBtn) handleExport(exportBtn);
});

async function handleExport(btn) {
  const kind = btn.dataset.export;
  const league = btn.dataset.league || null;

  if (kind === 'predictions') {
    const rows = await predictionRepository.exportRows({
      league,
      status: btn.dataset.status || null,
      market: btn.dataset.market || null,
      confidence: btn.dataset.confidence || null,
      engine: btn.dataset.engine || 'consensus',
      engineCorrect: btn.dataset.engineCorrect || null,
    });
    const cols = [
      { key: 'match_date', label: 'Date' }, { key: 'league', label: 'League' },
      { key: 'home_team', label: 'Home' }, { key: 'away_team', label: 'Away' },
      { key: 'consensus_outcome', label: 'Consensus' }, { key: 'dc_outcome', label: 'DC' },
      { key: 'ml_outcome', label: 'ML' }, { key: 'legacy_outcome', label: 'Legacy' },
      { key: 'confidence', label: 'Confidence' }, { key: 'status', label: 'Status' },
      { key: 'actual_outcome', label: 'Actual Result' }, { key: 'consensus_correct', label: 'Consensus Correct' },
    ];
    downloadCsv('predictions.csv', toCsv(rows, cols));
  } else if (kind === 'match_odds') {
    const rows = await oddsRepository.exportMatchOdds({ league });
    downloadCsv('match_odds.csv', toCsv(rows));
  } else if (kind === 'fortebet_odds') {
    const rows = await oddsRepository.exportFortebetOdds({ league });
    downloadCsv('fortebet_odds.csv', toCsv(rows));
  }
}

// Filter bar submit -> re-navigate with query params (Match Explorer).
document.addEventListener('submit', (e) => {
  const id = e.target.id;
  if (!['match-filter-form', 'team-filter-form', 'team-results-filter-form', 'player-filter-form', 'league-season-form', 'league-results-filter-form', 'prediction-explorer-filter-form', 'value-bets-filter-form', 'injuries-filter-form'].includes(id)) return;
  e.preventDefault();
  const data = new FormData(e.target);
  const params = new URLSearchParams();
  for (const [key, value] of data.entries()) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  if (id === 'match-filter-form') {
    location.hash = `#/matches${qs ? '?' + qs : ''}`;
  } else if (id === 'team-filter-form') {
    location.hash = `#/teams${qs ? '?' + qs : ''}`;
  } else if (id === 'team-results-filter-form') {
    const team = e.target.dataset.team;
    location.hash = `#/teams/${team}/results${qs ? '?' + qs : ''}`;
  } else if (id === 'player-filter-form') {
    location.hash = `#/players${qs ? '?' + qs : ''}`;
  } else if (id === 'league-season-form') {
    const league = e.target.dataset.league;
    const target = e.target.dataset.target;
    location.hash = `#/leagues/${league}/${target}${qs ? '?' + qs : ''}`;
  } else if (id === 'league-results-filter-form') {
    const league = e.target.dataset.league;
    location.hash = `#/leagues/${league}/results${qs ? '?' + qs : ''}`;
  } else if (id === 'prediction-explorer-filter-form') {
    // Preserve tab/view from the current URL -- the form itself only carries filters.
    const current = new URLSearchParams(location.hash.split('?')[1] || '');
    params.set('tab', e.target.dataset.tab);
    if (current.get('view')) params.set('view', current.get('view'));
    location.hash = `#/predictions?${params.toString()}`;
  } else if (id === 'value-bets-filter-form') {
    location.hash = `#/value-bets${qs ? '?' + qs : ''}`;
  } else if (id === 'injuries-filter-form') {
    location.hash = `#/injuries${qs ? '?' + qs : ''}`;
  }
});

function updateAuthNavState() {
  const loginLink  = document.getElementById('nav-login-link');
  const adminLink  = document.getElementById('nav-admin-link');
  const userBadge  = document.getElementById('nav-user-badge');

  if (!loginLink && !adminLink) return; // elements not in DOM yet

  if (authService.isLoggedIn) {
    if (loginLink)  loginLink.style.display  = 'none';
    if (adminLink)  adminLink.style.display  = '';
    if (userBadge) {
      userBadge.style.display = '';
      userBadge.textContent   = authService.user?.email?.[0]?.toUpperCase() ?? '?';
      userBadge.title         = authService.user?.email ?? '';
    }
  } else {
    if (loginLink)  loginLink.style.display  = '';
    if (adminLink)  adminLink.style.display  = 'none';
    if (userBadge)  userBadge.style.display  = 'none';
  }
}

function wireAuthEvents() {
  // Login password form
  document.addEventListener('submit', async (e) => {
    if (e.target.id === 'login-password-form') {
      e.preventDefault();
      const email    = document.getElementById('login-email')?.value?.trim();
      const password = document.getElementById('login-password')?.value;
      const btn      = document.getElementById('login-submit-btn');
      const errEl    = document.getElementById('login-error');
      const errMsg   = document.getElementById('login-error-msg');
      if (!email || !password) return;
      if (btn) { btn.textContent = 'Signing in…'; btn.disabled = true; }
      if (errEl) errEl.style.display = 'none';
      try {
        await authService.signInWithPassword(email, password);
        updateAuthNavState();
        window.location.hash = '#/admin';
      } catch (err) {
        if (errEl) errEl.style.display = 'flex';
        if (errMsg) errMsg.textContent = err.message || 'Sign-in failed.';
        if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
      }
    }

    // Magic link form
    if (e.target.id === 'login-magic-form') {
      e.preventDefault();
      const email = document.getElementById('login-magic-email')?.value?.trim();
      const btn   = document.getElementById('login-magic-btn');
      const errEl = document.getElementById('login-error');
      const errMsg= document.getElementById('login-error-msg');
      if (!email) return;
      if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
      if (errEl) errEl.style.display = 'none';
      try {
        await authService.sendMagicLink(email);
        window.location.hash = '#/login?magic=sent';
      } catch (err) {
        if (errEl) errEl.style.display = 'flex';
        if (errMsg) errMsg.textContent = err.message || 'Failed to send magic link.';
        if (btn) { btn.textContent = 'Send Magic Link'; btn.disabled = false; }
      }
    }
  });

  // Sign out button (in admin panel)
  document.addEventListener('click', async (e) => {
    if (e.target.id === 'admin-signout-btn') {
      await authService.signOut();
      updateAuthNavState();
      window.location.hash = '#/';
      return;
    }
    // Admin import file trigger
    if (e.target.id === 'admin-import-input' || e.target.closest?.('#admin-import-input')) return;
  });

  // Admin panel file import
  document.addEventListener('change', async (e) => {
    if (e.target.id === 'admin-import-input') {
      const file = e.target.files?.[0];
      if (file) await handleImport(file);
    }
  });

  // Also update auth state on every hash change (so admin link updates correctly)
  window.addEventListener('hashchange', updateAuthNavState);
}

function wireAdminEvents() {
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'admin-ui-settings-form') {
      e.preventDefault();
      const fd = new FormData(e.target);
      const updates = {};
      for (const [k, v] of fd.entries()) {
        updates[k] = v.trim();
      }
      saveSettings(updates);
      applyCustomLabels();
      const btn = document.getElementById('ui-save-btn');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = 'Saved!';
        setTimeout(() => btn.textContent = orig, 2000);
      }
    }
  });

  document.addEventListener('click', async (e) => {
    // Reset UI labels
    if (e.target.id === 'ui-reset-btn') {
      if (!confirm('Are you sure you want to reset all custom labels to their defaults?')) return;
      resetAllSettings();
      applyCustomLabels();
      window.location.reload();
    }

    // Clear analytics
    if (e.target.id === 'admin-clear-analytics-btn') {
      if (!confirm('Are you sure you want to delete all local usage data?')) return;
      analytics.clearAll();
      window.location.reload();
    }

    // User management (grant/revoke admin)
    if (e.target.classList.contains('admin-role-btn')) {
      const btn = e.target;
      const tr = btn.closest('tr');
      const uid = tr?.dataset.uid;
      const action = btn.dataset.action; // 'admin' or 'viewer'
      if (!uid) return;

      if (!confirm(`Are you sure you want to make this user a ${action}?`)) return;

      const origText = btn.textContent;
      btn.textContent = 'Updating...';
      btn.disabled = true;

      try {
        await setUserRole(uid, action);
        // reload the admin page to see changes
        window.location.reload();
      } catch (err) {
        alert('Failed to update role: ' + err.message);
        btn.textContent = origText;
        btn.disabled = false;
      }
    }
  });
}

function wireSettingsEvents() {
  const modal = document.getElementById('user-settings-modal');
  const viewModeSelect = document.getElementById('settings-view-mode');
  const oddsFormatSelect = document.getElementById('settings-odds-format');
  const timezoneSelect = document.getElementById('settings-timezone');
  const themeSelect = document.getElementById('settings-theme');
  const bgOpacityInput = document.getElementById('settings-bg-opacity');
  const bgOpacityVal = document.getElementById('settings-bg-opacity-val');

  function applyBgOpacity(val) {
    const tintPct = 100 - parseInt(val, 10);
    document.body.style.setProperty('--bg-tint', `${tintPct}%`);
  }

  // Initialize UI with current settings
  if (viewModeSelect) viewModeSelect.value = userSettings.get('viewMode') || 'cards';
  if (oddsFormatSelect) oddsFormatSelect.value = userSettings.get('oddsFormat') || 'decimal';
  if (timezoneSelect) timezoneSelect.value = userSettings.get('timezone') || 'local';
  if (themeSelect) themeSelect.value = userSettings.get('theme') || 'theme-a';
  
  const initialOpacity = userSettings.get('bgOpacity') ?? 20;
  if (bgOpacityInput) {
    bgOpacityInput.value = initialOpacity;
    if (bgOpacityVal) bgOpacityVal.textContent = initialOpacity + '%';
  }

  // Apply initial theme and opacity
  document.body.className = userSettings.get('theme') || 'theme-a';
  applyBgOpacity(initialOpacity);

  // Open modal (from top nav or bottom nav)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#nav-settings-btn') || e.target.closest('#bottom-nav-settings');
    if (btn && modal) {
      modal.showModal();
    }
  });

  // Close modal
  document.addEventListener('click', (e) => {
    if (e.target.id === 'user-settings-close' && modal) {
      modal.close();
    }
    // Click outside to close
    if (e.target === modal) {
      modal.close();
    }
  });

  // Handle setting changes
  if (viewModeSelect) {
    viewModeSelect.addEventListener('change', (e) => userSettings.set('viewMode', e.target.value));
  }
  if (oddsFormatSelect) {
    oddsFormatSelect.addEventListener('change', (e) => userSettings.set('oddsFormat', e.target.value));
  }
  if (timezoneSelect) {
    timezoneSelect.addEventListener('change', (e) => userSettings.set('timezone', e.target.value));
  }
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      userSettings.set('theme', e.target.value);
      document.body.className = e.target.value;
    });
  }
  if (bgOpacityInput) {
    bgOpacityInput.addEventListener('input', (e) => {
      if (bgOpacityVal) bgOpacityVal.textContent = e.target.value + '%';
      applyBgOpacity(e.target.value);
    });
    bgOpacityInput.addEventListener('change', (e) => {
      userSettings.set('bgOpacity', parseInt(e.target.value, 10));
    });
  }

  // Re-render current page when settings change
  window.addEventListener('plusone:settings-changed', (e) => {
    // Only re-render if it's a setting that affects the current view (theme/opacity just change CSS)
    if (e.detail.key !== 'theme' && e.detail.key !== 'bgOpacity' && window.PlusOne && window.PlusOne.router) {
      window.PlusOne.router._resolve();
    }
  });
}

boot();
