/**
 * supabaseAdapter.js
 *
 * A cloud adapter that wraps the Supabase JS client and provides the SAME
 * interface as StorageAdapter (hasTable, hasColumn, all, get, availableColumns,
 * rowCount, getSummary) so all repositories work unchanged against either backend.
 *
 * Design rules (mirror of storageAdapter.js):
 *  - Never imports UI code.
 *  - All queries are read-only (no INSERT/UPDATE/DELETE from the browser).
 *  - Provides schema introspection equivalent (hasTable, hasColumn).
 *  - Pagination is handled at the query level via Supabase range().
 *  - Complex aggregations are delegated to Postgres RPC functions defined in
 *    supabase_schema.sql, because PostgREST cannot express subqueries or window
 *    functions over simple table endpoints.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig.js';

/** Tables this app knows about in Supabase. Used for hasTable() checks. */
const KNOWN_TABLES = new Set([
  'matches', 'prediction_log', 'market_predictions', 'players',
  'team_stats', 'team_injuries', 'match_odds', 'fortebet_odds',
  'team_logos', 'league_logos', 'discovered_leagues', 'league_params',
  'engine_weights', 'key_value', 'historical_results', 'team_name_aliases',
  'match_weather', 'match_referees', 'team_lineups', 'understat_team_stats',
  'scraper_health', 'live_standings', 'live_standings_rows',
  'live_match_metadata', 'live_h2h_matches', 'live_venues',
  'league_mappings', 'clubelo_fixtures', 'fortebet_match_bridge',
  'referees',
]);

/**
 * Per-table column schema — mirrors the Postgres schema from supabase_schema.sql.
 * Used for hasColumn() and availableColumns() without needing to round-trip the DB.
 * When new columns are added to Supabase, add them here too.
 */
const TABLE_COLUMNS = {
  matches: ['id','home_team','away_team','league','season','match_date','gameweek',
    'start_time','home_score','away_score','home_xg','away_xg','scraped_at'],
  prediction_log: ['id','match_id','home_team','away_team','league','match_date','season',
    'dc_outcome','dc_home_prob','dc_draw_prob','dc_away_prob',
    'ml_outcome','ml_home_prob','ml_draw_prob','ml_away_prob',
    'legacy_outcome','legacy_home_prob','legacy_draw_prob','legacy_away_prob',
    'consensus_outcome','consensus_home_prob','consensus_draw_prob','consensus_away_prob',
    'best_bet_outcome','best_bet_correct','second_best_bet_outcome','second_best_bet_correct',
    'engine_agreement','value_gap_home','value_gap_draw','value_gap_away',
    'calibrated_prob','dc_expected_home','dc_expected_away',
    'h2h_home_wins','h2h_draws','h2h_away_wins','h2h_total','h2h_home_rate','h2h_avg_goals',
    'confidence','actual_home_score','actual_away_score','actual_outcome',
    'dc_correct','ml_correct','legacy_correct','consensus_correct',
    'predicted_at','evaluated_at','status',
    'score_pred_1','score_prob_1','score_pred_2','score_prob_2',
    'score_pred_3','score_prob_3','score_pred_correct'],
  market_predictions: ['id','match_id','home_team','away_team','league','match_date',
    'expected_home','expected_away','over_05','under_05','over_15','under_15',
    'over_25','under_25','over_35','under_35','btts_yes','btts_no',
    'dc_1x','dc_12','dc_x2','dc_label','home_to_score','away_to_score',
    'best_bet_outcome','best_bet_prob','best_bet_score','best_bet_correct',
    'second_best_bet_outcome','second_best_bet_prob','second_best_bet_score','second_best_bet_correct',
    'over_05_correct','over_15_correct','over_25_correct','over_35_correct',
    'btts_correct','dc_correct','home_to_score_correct','away_to_score_correct',
    'predicted_at','evaluated_at','status'],
  players: ['id','player','team','league','season','nationality','position','age',
    'games','games_starts','minutes','goals','assists','goals_per90','assists_per90',
    'cards_yellow','cards_red','xg','xg_per90','xa','xa_per90',
    'progressive_carries','progressive_passes','updated_at'],
  team_stats: ['id','team','league','season','goals_scored','goals_conceded',
    'goals_per_game','conceded_per_game','attack_strength','defence_weakness',
    'home_goals_pg','away_goals_pg','home_conceded_pg','away_conceded_pg','form_score',
    'wins','draws','losses','games_played','clean_sheets','win_rate','points',
    'possession_avg','shots_on_target_pg','xg_per_game','xg_against_pg','updated_at'],
  team_injuries: ['id','league','club','player','position','injury','return_date',
    'market_value','scraped_date','updated_at'],
  match_odds: ['id','home_team','away_team','league','season','match_date',
    'odds_home','odds_draw','odds_away','bookmaker','scraped_at'],
  fortebet_odds: ['id','home_team','away_team','league','season','match_date',
    'odds_home','odds_draw','odds_away','scraped_at'],
  team_logos: ['id','team','league','logo_url','scraped_at','updated_at'],
  match_weather: ['id','home_team','away_team','league','match_date',
    'temperature_c','condition','wind_kmh','humidity_pct','scraped_at'],
  match_referees: ['id','match_id','league','match_date','home_team','away_team',
    'referee','scraped_at'],
  referees: ['id','name','league','season','matches','home_win_pct',
    'draw_pct','away_win_pct','yellow_cards_pg','red_cards_pg','penalties_pg',
    'home_bias_score','updated_at'],
  team_lineups: ['id','match_id','team','league','match_date','formation','players','scraped_at','updated_at'],
  league_logos: ['league','logo_url','scraped_at','updated_at'],
  discovered_leagues: ['comps_id','name','slug_base','country_code','gender','tier',
    'current_season','is_selected','discovered_at','updated_at'],
  league_params: ['id','league','param_key','param_value','updated_at'],
  engine_weights: ['id','dc_weight','ml_weight','legacy_weight','source',
    'sample_size','naive_rate','computed_at'],
  key_value: ['key','value'],
  team_name_aliases: ['raw_name','canonical_name','score','resolved_at'],
  historical_results: ['id','home_team','away_team','league','season','match_date',
    'home_score','away_score','home_yellow','away_yellow','home_corners','away_corners','scraped_at'],
};

/** Cache of row counts per table (populated on init). */
const _rowCountCache = new Map();
/** Populated tables (rowCount > 0) */
const _populatedTables = new Set();

/**
 * Raw PostgREST fetch. Returns parsed JSON array or throws.
 * @param {string} path  e.g. '/rest/v1/matches?...'
 */
async function _restFetch(path, options = {}) {
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase REST error ${res.status} on ${path}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Call a Supabase RPC (Postgres function). Returns the function's return value.
 * @param {string} fnName  Postgres function name
 * @param {object} params  Named parameters to pass
 */
async function _rpc(fnName, params = {}) {
  return _restFetch(`/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Build a PostgREST filter query string from conditions.
 * conditions: [{ col, op, val }]  op: 'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'like'|'in'|'is'
 */
function _buildFilter(conditions = []) {
  return conditions.map(({ col, op, val }) => {
    if (col === 'or')  return `or=${encodeURIComponent(val)}`;
    if (col === 'and') return `and=${encodeURIComponent(val)}`;
    if (op === 'in') return `${col}=in.(${val.join(',')})`;
    if (op === 'like') return `${col}=like.*${val}*`;
    if (op === 'ilike') return `${col}=ilike.*${val}*`;
    if (op === 'is') return `${col}=is.${val}`;
    if (op === 'not.is') return `${col}=not.is.${val}`;
    return `${col}=${op}.${encodeURIComponent(val)}`;
  }).join('&');
}

export class SupabaseAdapter {
  constructor() {
    this.ready = false;
    this.loadedAt = null;
  }

  /**
   * Initialize: probe Supabase to confirm connectivity and cache row counts.
   * Called once during boot, replaces StorageAdapter.init() + restoreFromOPFS().
   */
  async init() {
    // Check a core table exists by fetching 1 row
    await _restFetch('/rest/v1/matches?select=id&limit=1');

    // Cache row counts for all known tables (one request per table, in parallel)
    const countPromises = [...KNOWN_TABLES].map(async (table) => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=0`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'count=exact',
          },
        });
        if (res.ok) {
          const cr = res.headers.get('Content-Range') || '';
          const n = cr.includes('/') ? parseInt(cr.split('/')[1], 10) : 0;
          _rowCountCache.set(table, isNaN(n) ? 0 : n);
          if (n > 0) _populatedTables.add(table);
        } else {
          _rowCountCache.set(table, 0);
        }
      } catch {
        _rowCountCache.set(table, 0);
      }
    });
    await Promise.all(countPromises);

    this.ready = true;
    this.loadedAt = new Date();
    return this;
  }

  /** Does this table exist (and is it in the schema)? */
  hasTable(name) {
    return KNOWN_TABLES.has(name);
  }

  /** Does this table exist AND have this column? */
  hasColumn(table, column) {
    const cols = TABLE_COLUMNS[table];
    if (!cols) return false;
    return cols.includes(column);
  }

  /** Filter a wishlist to only columns that actually exist. */
  availableColumns(table, wishlist) {
    const cols = TABLE_COLUMNS[table];
    if (!cols) return [];
    const have = new Set(cols);
    return wishlist.filter((c) => have.has(c));
  }

  rowCount(table) {
    return _rowCountCache.get(table) ?? 0;
  }

  getSummary() {
    return {
      tables: [...KNOWN_TABLES].sort(),
      rowCounts: Object.fromEntries(_rowCountCache),
      loadedAt: this.loadedAt,
      source: 'supabase',
    };
  }

  /**
   * Generic read — returns array of row objects.
   * Supported for simple table queries; complex queries should use rpc().
   *
   * @param {string} table     Table name
   * @param {string[]} select  Columns to return (default: ['*'])
   * @param {Array}  conditions  [{col, op, val}] filter conditions
   * @param {string} order     e.g. 'match_date.desc'
   * @param {number} limit
   * @param {number} offset
   */
  async query(table, { select = ['*'], conditions = [], order = null, limit = 1000, offset = 0 } = {}) {
    let path = `/rest/v1/${table}?select=${select.join(',')}&limit=${limit}&offset=${offset}`;
    const filterStr = _buildFilter(conditions);
    if (filterStr) path += `&${filterStr}`;
    if (order) path += `&order=${order}`;
    return _restFetch(path);
  }

  /**
   * Count rows matching conditions.
   * @returns {Promise<number>}
   */
  async count(table, conditions = []) {
    let path = `/rest/v1/${table}?select=id&limit=0`;
    const filterStr = _buildFilter(conditions);
    if (filterStr) path += `&${filterStr}`;
    const res = await fetch(`${SUPABASE_URL}${path}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'count=exact',
      },
    });
    const cr = res.headers.get('Content-Range') || '';
    return cr.includes('/') ? parseInt(cr.split('/')[1], 10) : 0;
  }

  /**
   * Call a Postgres RPC function. Returns the result directly.
   */
  async rpc(fnName, params = {}) {
    return _rpc(fnName, params);
  }

  /**
   * Find a single row by primary key.
   */
  async findById(table, id) {
    const rows = await this.query(table, {
      conditions: [{ col: 'id', op: 'eq', val: id }],
      limit: 1,
    });
    return rows[0] ?? null;
  }
}

export const supabaseAdapter = new SupabaseAdapter();
