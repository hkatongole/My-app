/**
 * analytics.js — Local Usage Analytics
 *
 * Tracks how users navigate and interact with the app.
 * All data stays in localStorage — no server, no external service, no PII.
 *
 * What is tracked:
 *  - Page views per route (count + timestamps of last 10 visits)
 *  - Total session count
 *  - Total time on site (approximate, in seconds)
 *  - Most-used filters (league, team, etc.)
 *  - Click events on match cards (most-viewed teams/matches)
 *  - Feature usage (export CSV, value bets filter used, etc.)
 *
 * Usage:
 *  import { analytics } from './admin/analytics.js';
 *  analytics.trackPageView('/matches');
 *  analytics.trackEvent('export_csv', { league: 'Premier League' });
 */

const STORAGE_KEY  = 'plusone_analytics';
const SESSION_KEY  = 'plusone_session';
const MAX_HISTORY  = 20;   // max timestamp entries per page
const SESSION_GAP  = 30 * 60 * 1000;  // 30 minutes gap = new session

function _now() {
  return Date.now();
}

function _load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function _save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full — silently skip
  }
}

function _getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
  } catch {
    return {};
  }
}

function _setSession(s) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

class Analytics {
  constructor() {
    this._sessionStart = _now();
    this._initSession();
  }

  _initSession() {
    const data = _load();
    const now  = _now();

    // Detect if this is a new session (30 min gap or first visit)
    const lastActive = data.lastActiveAt || 0;
    const isNew = (now - lastActive) > SESSION_GAP;

    if (isNew) {
      data.sessionCount = (data.sessionCount || 0) + 1;
    }
    data.lastActiveAt = now;
    _save(data);

    // Session-level tracking
    const sess = _getSession();
    if (!sess.startedAt) {
      sess.startedAt = now;
      sess.pages = [];
      _setSession(sess);
    }
  }

  /**
   * Track a page view.
   * @param {string} route  e.g. '/matches', '/matches/abc123'
   */
  trackPageView(route) {
    // Normalize: strip IDs to keep stats meaningful
    const page = this._normalizePage(route);

    const data = _load();
    const now  = _now();

    if (!data.pages) data.pages = {};
    if (!data.pages[page]) data.pages[page] = { count: 0, history: [] };
    data.pages[page].count++;
    data.pages[page].history = [now, ...(data.pages[page].history || [])].slice(0, MAX_HISTORY);
    data.pages[page].lastVisit = now;
    data.lastActiveAt = now;

    _save(data);

    // Session tracking
    const sess = _getSession();
    sess.pages = [...(sess.pages || []), page].slice(-50);
    sess.lastRoute = page;
    _setSession(sess);
  }

  /**
   * Track a named event with optional metadata.
   * @param {string} event  e.g. 'export_csv', 'filter_applied', 'match_card_click'
   * @param {object} meta   { league, team, ... }
   */
  trackEvent(event, meta = {}) {
    const data = _load();
    const now  = _now();

    if (!data.events) data.events = {};
    if (!data.events[event]) data.events[event] = { count: 0, meta: [] };
    data.events[event].count++;

    if (Object.keys(meta).length > 0) {
      // Keep the last 20 meta entries per event type
      const entry = { t: now, ...meta };
      data.events[event].meta = [entry, ...(data.events[event].meta || [])].slice(0, 20);
    }

    data.lastActiveAt = now;
    _save(data);
  }

  /**
   * Normalize a route — replace IDs with placeholders.
   * /matches/abc123 → /matches/:id
   * /teams/Arsenal  → /teams/:team
   */
  _normalizePage(route) {
    return route
      .replace(/\/matches\/[^/]+/, '/matches/:id')
      .replace(/\/teams\/[^/]+\/(\w+)/, '/teams/:team/$1')
      .replace(/\/teams\/[^/]+/, '/teams/:team')
      .replace(/\/players\/[^/]+\/(\w+)/, '/players/:player/$1')
      .replace(/\/players\/[^/]+/, '/players/:player')
      .replace(/\/leagues\/[^/]+\/(\w+)/, '/leagues/:league/$1')
      .replace(/\/leagues\/[^/]+/, '/leagues/:league')
      .replace(/\?.*/, '');  // strip query params
  }

  /**
   * Get all analytics data for the admin panel.
   */
  getReport() {
    const data = _load();

    // Top pages sorted by view count
    const pages = Object.entries(data.pages || {})
      .map(([path, d]) => ({ path, count: d.count, lastVisit: d.lastVisit }))
      .sort((a, b) => b.count - a.count);

    // Top events
    const events = Object.entries(data.events || {})
      .map(([name, d]) => ({ name, count: d.count }))
      .sort((a, b) => b.count - a.count);

    // Total page views
    const totalPageViews = pages.reduce((s, p) => s + p.count, 0);

    // Current session info
    const sess = _getSession();
    const sessionDurationMin = sess.startedAt
      ? Math.round((_now() - sess.startedAt) / 60000)
      : 0;

    return {
      sessionCount:     data.sessionCount || 0,
      totalPageViews,
      lastActiveAt:     data.lastActiveAt || null,
      pages,
      events,
      currentSession: {
        pagesVisited: (sess.pages || []).length,
        durationMin:  sessionDurationMin,
        lastRoute:    sess.lastRoute || '/',
      },
    };
  }

  /**
   * Clear all analytics data.
   */
  clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }
}

export const analytics = new Analytics();
