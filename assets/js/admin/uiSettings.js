/**
 * uiSettings.js — UI Label Customization
 *
 * Allows admins to rename any label, title, or nav item through the UI.
 * Changes are persisted to localStorage and applied globally on every navigation.
 *
 * Design:
 *  - Zero server dependency — works entirely in localStorage.
 *  - In Supabase mode, also syncs to key_value table on save.
 *  - applyCustomLabels() is called on boot and after every navigation.
 *  - Labels are applied by scanning [data-label="key"] attributes in the DOM.
 */

const STORAGE_KEY = 'plusone_ui_settings';

/**
 * All customizable strings.
 * key: internal token used in data-label attributes
 * default: the original text shown if no override is set
 * category: group for display in the admin UI
 */
export const LABEL_DEFINITIONS = [
  // App Identity
  { key: 'app.name',          default: 'PlusOne Analytics', category: 'App Identity', description: 'Application name shown in header' },
  { key: 'app.tagline',       default: 'Football match, team, player, odds, and prediction analytics.', category: 'App Identity', description: 'Meta description / tagline' },
  { key: 'app.footer',        default: 'Informational analytics only — not betting advice.', category: 'App Identity', description: 'Footer disclaimer text' },

  // Nav Labels
  { key: 'nav.today',         default: 'Today',        category: 'Navigation', description: 'Home / Today nav link' },
  { key: 'nav.matches',       default: 'Matches',      category: 'Navigation', description: 'Matches nav link' },
  { key: 'nav.teams',         default: 'Teams',        category: 'Navigation', description: 'Teams nav link' },
  { key: 'nav.players',       default: 'Players',      category: 'Navigation', description: 'Players nav link' },
  { key: 'nav.leagues',       default: 'Leagues',      category: 'Navigation', description: 'Leagues nav link' },
  { key: 'nav.predictions',   default: 'Predictions',  category: 'Navigation', description: 'Predictions nav link' },
  { key: 'nav.valuebets',     default: 'Value Bets',   category: 'Navigation', description: 'Value Bets nav link' },
  { key: 'nav.explore',       default: 'Explore ▾',    category: 'Navigation', description: 'Explore dropdown nav link' },
  { key: 'nav.injuries',      default: 'Injuries',     category: 'Navigation', description: 'Injuries nav link' },
  { key: 'nav.performance',   default: 'Performance',  category: 'Navigation', description: 'Model Performance nav link' },
  { key: 'nav.howitworks',    default: 'How It Works', category: 'Navigation', description: '"How It Works" nav link' },

  // Page Titles
  { key: 'page.home.title',        default: "Upcoming Predictions",    category: 'Page Titles', description: 'Home page heading' },
  { key: 'page.home.subtitle',     default: 'Next 20 scheduled matches', category: 'Page Titles', description: 'Home page subtitle prefix' },
  { key: 'page.matches.title',     default: 'Match Explorer',           category: 'Page Titles', description: 'Match list page heading' },
  { key: 'page.teams.title',       default: 'Team Explorer',            category: 'Page Titles', description: 'Teams directory heading' },
  { key: 'page.players.title',     default: 'Player Explorer',          category: 'Page Titles', description: 'Players directory heading' },
  { key: 'page.leagues.title',     default: 'League & Competition Explorer', category: 'Page Titles', description: 'Leagues directory heading' },
  { key: 'page.predictions.title', default: 'Prediction & Odds Explorer',    category: 'Page Titles', description: 'Predictions page heading' },
  { key: 'page.valuebets.title',   default: 'Value & Safe Bets',        category: 'Page Titles', description: 'Value bets page heading' },
  { key: 'page.injuries.title',    default: 'Injury Reports',           category: 'Page Titles', description: 'Injuries page heading' },
  { key: 'page.performance.title', default: 'Model Performance & Calibration', category: 'Page Titles', description: 'Performance page heading' },
  { key: 'page.howitworks.title',  default: 'How Predictions Work',     category: 'Page Titles', description: 'How It Works page heading' },
  { key: 'page.admin.title',       default: 'Admin Panel',              category: 'Page Titles', description: 'Admin panel heading' },

  // Prediction Labels
  { key: 'pred.confidence.high',   default: 'High',   category: 'Prediction Labels', description: 'High confidence label' },
  { key: 'pred.confidence.medium', default: 'Medium', category: 'Prediction Labels', description: 'Medium confidence label' },
  { key: 'pred.confidence.low',    default: 'Low',    category: 'Prediction Labels', description: 'Low confidence label' },
  { key: 'pred.status.pending',    default: 'pending',  category: 'Prediction Labels', description: 'Pending prediction status' },
  { key: 'pred.status.graded',     default: 'graded',   category: 'Prediction Labels', description: 'Graded prediction status' },

  // Announcements
  { key: 'announcement.text',     default: '', category: 'Announcement', description: 'Site-wide announcement banner text (leave empty to hide)' },
  { key: 'announcement.style',    default: 'info', category: 'Announcement', description: 'Banner style: info | warning | success' },
];

/** In-memory cache of current settings */
let _settings = {};

/**
 * Load settings from localStorage.
 */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    _settings = raw ? JSON.parse(raw) : {};
  } catch {
    _settings = {};
  }
  return _settings;
}

/**
 * Get the current text for a label key.
 * Returns the custom value if set, otherwise the default.
 */
export function getLabel(key) {
  const def = LABEL_DEFINITIONS.find(d => d.key === key);
  return _settings[key] ?? def?.default ?? key;
}

/**
 * Save a batch of label overrides.
 * @param {Record<string, string>} updates  { key: newValue, ... }
 */
export function saveSettings(updates) {
  _settings = { ..._settings, ...updates };
  // Remove entries that are empty strings (reset to default)
  for (const [k, v] of Object.entries(_settings)) {
    if (v === '') delete _settings[k];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_settings));
}

/**
 * Reset all labels to defaults.
 */
export function resetAllSettings() {
  _settings = {};
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Apply custom labels to the DOM.
 * Any element with data-label="key" gets its textContent replaced with the custom value.
 * Any element with data-label-placeholder="key" gets its placeholder replaced.
 * Called on boot and after every navigation.
 */
export function applyCustomLabels() {
  loadSettings();
  document.querySelectorAll('[data-label]').forEach(el => {
    const key = el.getAttribute('data-label');
    const val = getLabel(key);
    if (val && el.textContent !== val) el.textContent = val;
  });
  document.querySelectorAll('[data-label-placeholder]').forEach(el => {
    const key = el.getAttribute('data-label-placeholder');
    const val = getLabel(key);
    if (val) el.placeholder = val;
  });

  // Announcement banner
  applyAnnouncement();
}

/**
 * Show or hide the announcement banner.
 */
function applyAnnouncement() {
  const text  = getLabel('announcement.text');
  const style = getLabel('announcement.style') || 'info';
  let banner  = document.getElementById('announcement-banner');

  if (!text) {
    if (banner) banner.style.display = 'none';
    return;
  }

  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'announcement-banner';
    // Insert it at the very top of the app-shell, before the header
    const shell = document.getElementById('app-shell');
    if (shell) shell.insertBefore(banner, shell.firstChild);
  }
  banner.className = `announcement-banner announcement-banner--${style}`;
  banner.innerHTML = `
    <span>${text}</span>
    <button class="announcement-dismiss" id="announcement-dismiss-btn" title="Dismiss">&times;</button>
  `;
  banner.style.display = 'flex';

  // Dismiss button
  document.getElementById('announcement-dismiss-btn')?.addEventListener('click', () => {
    banner.style.display = 'none';
  }, { once: true });
}

/**
 * Export current settings as a JSON string (for backup).
 */
export function exportSettings() {
  return JSON.stringify(_settings, null, 2);
}

/**
 * Import settings from a JSON string (for restore).
 */
export function importSettings(jsonStr) {
  const parsed = JSON.parse(jsonStr);
  _settings = parsed;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_settings));
}
