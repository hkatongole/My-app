/**
 * userSettings.js
 * 
 * Manages user-specific preferences stored in localStorage.
 * Triggers a global event when settings change so UI components can re-render.
 */

const SETTINGS_KEY = 'plusone_user_settings';

const DEFAULT_SETTINGS = {
  theme: 'theme-a', // 'theme-a', 'theme-b', 'theme-c'
  bgOpacity: 20, // 0 to 100
  viewMode: 'cards', // 'cards' or 'table'
  oddsFormat: 'decimal', // 'decimal', 'fractional', 'american'
  timezone: 'local' // 'local', 'utc'
};

class UserSettings {
  constructor() {
    this._settings = { ...DEFAULT_SETTINGS };
    this._load();
  }

  _load() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        this._settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load user settings:', e);
    }
  }

  _save() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this._settings));
    } catch (e) {
      console.warn('Failed to save user settings:', e);
    }
  }

  get(key) {
    return this._settings[key];
  }

  set(key, value) {
    if (this._settings[key] !== value) {
      this._settings[key] = value;
      this._save();
      // Dispatch a custom event so the UI can respond immediately
      window.dispatchEvent(new CustomEvent('plusone:settings-changed', {
        detail: { key, value }
      }));
    }
  }

  getAll() {
    return { ...this._settings };
  }
}

export const userSettings = new UserSettings();
