/**
 * repositories.js  —  Unified repository barrel
 *
 * This is the ONLY file page code should import repositories from.
 * It exports the correct implementation (SQLite or Supabase) based on
 * supabaseConfig.js, and wraps everything so all method calls are async.
 *
 * Pages already live inside `async function render*()` and the router
 * already does `await route.render()`, so awaiting repository calls is
 * a zero-cost change to the calling pattern.
 *
 * How it works:
 *  - USE_SUPABASE=true  → exports CloudXxxRepository from cloudRepositories.js
 *  - USE_SUPABASE=false → exports async-wrapped SQLite repositories (sync methods
 *    wrapped in Promise.resolve so await still works, no behavior change)
 */

import { USE_SUPABASE } from './supabaseConfig.js';

// ─── Cloud path ────────────────────────────────────────────────────────────
import {
  matchRepository      as cloudMatchRepo,
  leagueRepository     as cloudLeagueRepo,
  teamRepository       as cloudTeamRepo,
  playerRepository     as cloudPlayerRepo,
  predictionRepository as cloudPredictionRepo,
  oddsRepository       as cloudOddsRepo,
  logoRepository       as cloudLogoRepo,
} from './cloudRepositories.js';

// ─── SQLite path ───────────────────────────────────────────────────────────
import { matchRepository      as sqliteMatchRepo }      from './repositories/matchRepository.js';
import { leagueRepository     as sqliteLeagueRepo }     from './repositories/leagueRepository.js';
import { teamRepository       as sqliteTeamRepo }       from './repositories/teamRepository.js';
import { playerRepository     as sqlitePlayerRepo }     from './repositories/playerRepository.js';
import { predictionRepository as sqlitePredictionRepo } from './repositories/predictionRepository.js';
import { oddsRepository       as sqliteOddsRepo }       from './repositories/oddsRepository.js';

/**
 * Wraps a sync repository so every method returns a Promise.
 * This lets page code use `await repo.method()` uniformly regardless
 * of whether we're in SQLite mode or Supabase mode.
 */
function asyncify(syncRepo) {
  return new Proxy(syncRepo, {
    get(target, prop) {
      const val = target[prop];
      if (typeof val === 'function') {
        return (...args) => Promise.resolve(val.apply(target, args));
      }
      return val;
    },
  });
}

/** Minimal logo repo shim for SQLite mode (uses team_logos table if present). */
const sqliteLogoRepo = {
  async getTeamLogo(team, league) {
    // logoRepository reads from team_logos via storage directly
    const { storage } = await import('./storageAdapter.js');
    if (!storage.hasTable('team_logos')) return null;
    const row = storage.get(
      `SELECT logo_url FROM team_logos WHERE team = ? AND league = ? LIMIT 1`,
      [team, league]
    );
    return row?.logo_url ?? null;
  },
};

// ─── Exports ───────────────────────────────────────────────────────────────
export const matchRepository      = USE_SUPABASE ? cloudMatchRepo      : asyncify(sqliteMatchRepo);
export const leagueRepository     = USE_SUPABASE ? cloudLeagueRepo     : asyncify(sqliteLeagueRepo);
export const teamRepository       = USE_SUPABASE ? cloudTeamRepo       : asyncify(sqliteTeamRepo);
export const playerRepository     = USE_SUPABASE ? cloudPlayerRepo     : asyncify(sqlitePlayerRepo);
export const predictionRepository = USE_SUPABASE ? cloudPredictionRepo : asyncify(sqlitePredictionRepo);
export const oddsRepository       = USE_SUPABASE ? cloudOddsRepo       : asyncify(sqliteOddsRepo);
export const logoRepository       = USE_SUPABASE ? cloudLogoRepo       : sqliteLogoRepo;

export { USE_SUPABASE };
