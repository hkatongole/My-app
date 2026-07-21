/**
 * cloudRepositories.js
 *
 * Cloud (Supabase) implementations of all repository methods.
 * When USE_SUPABASE=true in supabaseConfig.js, app.js imports from here
 * instead of the individual SQLite repositories.
 *
 * Each repository class mirrors the exact same method signatures as the
 * SQLite equivalents so ALL page code (home.js, matchDetail.js, etc.)
 * works unchanged.
 *
 * Complex queries (joins, window functions, aggregates) use Supabase RPC
 * functions defined in supabase_schema.sql. Simple filtered queries use
 * the PostgREST REST API directly via supabaseAdapter.query().
 */

import { supabaseAdapter as db } from './supabaseAdapter.js';

// ---------------------------------------------------------------------------
// Shared pagination helper
// ---------------------------------------------------------------------------
async function paginate(table, {
  conditions = [],
  order = null,
  page = 1,
  pageSize = 25,
  select = ['*'],
} = {}) {
  const offset = (page - 1) * pageSize;
  const [rows, total] = await Promise.all([
    db.query(table, { select, conditions, order, limit: pageSize, offset }),
    db.count(table, conditions),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

// ---------------------------------------------------------------------------
// Match Repository
// ---------------------------------------------------------------------------
class CloudMatchRepository {
  async listLeagues() {
    const rows = await db.rpc('get_distinct_leagues');
    return rows || [];
  }

  async listSeasons(league = null) {
    const rows = await db.rpc('get_distinct_seasons', { p_league: league ?? null });
    return rows || [];
  }

  async fixturesForDate(dateStr, { league = null } = {}) {
    const params = { p_date: dateStr, p_league: league ?? null };
    return db.rpc('get_fixtures_for_date', params);
  }

  async upcomingFixtures(fromDateStr, { league = null, limit = 20 } = {}) {
    const conditions = [{ col: 'match_date', op: 'gte', val: fromDateStr }];
    if (league) conditions.push({ col: 'league', op: 'eq', val: league });
    const rows = await db.query('matches', {
      select: ['*', 'prediction_log(consensus_outcome, consensus_home_prob, consensus_draw_prob, consensus_away_prob, confidence, value_gap_home, value_gap_draw, value_gap_away, best_bet_outcome, status, predicted_at)'],
      conditions,
      order: 'match_date.asc,start_time.asc',
      limit
    });
    return rows.map(r => {
      const p = r.prediction_log?.[0];
      if (p) {
         r.pred_consensus_outcome = p.consensus_outcome;
         r.pred_confidence = p.confidence;
         r.pred_value_gap_home = p.value_gap_home;
         r.pred_value_gap_draw = p.value_gap_draw;
         r.pred_value_gap_away = p.value_gap_away;
      }
      delete r.prediction_log;
      return r;
    });
  }

  async nextFixtureDate(fromDateStr) {
    const result = await db.rpc('get_next_fixture_date', { p_from_date: fromDateStr });
    // RPC returns a single scalar — Supabase wraps it in an array for table-returning functions
    if (Array.isArray(result)) return result[0]?.get_next_fixture_date ?? null;
    return result ?? null;
  }

  async filterMatches({ league, season, team, dateFrom, dateTo, page = 1, pageSize = 25 } = {}) {
    const conditions = [];
    if (league)   conditions.push({ col: 'league',     op: 'eq',  val: league });
    if (season)   conditions.push({ col: 'season',     op: 'eq',  val: season });
    if (dateFrom) conditions.push({ col: 'match_date', op: 'gte', val: dateFrom });
    if (dateTo)   conditions.push({ col: 'match_date', op: 'lte', val: dateTo });
    if (team) {
      // PostgREST doesn't support OR across columns — use or= syntax
      conditions.push({ col: 'or', op: '', val: `(home_team.eq.${team},away_team.eq.${team})` });
    }
    return paginate('matches', { conditions, order: 'match_date.desc,start_time.desc', page, pageSize });
  }

  async detailBundle(matchId) {
    const [match, prediction, odds, weather, market] = await Promise.all([
      db.findById('matches', matchId),
      db.query('prediction_log', { conditions: [{ col: 'match_id', op: 'eq', val: matchId }], limit: 1 }),
      db.query('match_odds', { conditions: [{ col: 'match_id', op: 'eq', val: matchId }], limit: 1 }).catch(() => []),
      db.query('match_weather', { conditions: [{ col: 'match_id', op: 'eq', val: matchId }], limit: 1 }).catch(() => []),
      db.query('market_predictions', { conditions: [{ col: 'match_id', op: 'eq', val: matchId }], limit: 1 }).catch(() => []),
    ]);
    if (!match) return null;
    
    const [injuryRows, h2hRows] = await Promise.all([
      (db.rowCount('team_injuries') > 0)
        ? db.query('team_injuries', {
            conditions: [{ col: 'or', op: '', val: `(club.eq.${match.home_team},club.eq.${match.away_team})` }],
            order: 'return_date.asc',
          }).catch(() => [])
        : [],
      (db.rowCount('historical_results') > 0)
        ? db.query('historical_results', {
            conditions: [{ col: 'or', op: '', val: `and(home_team.eq.${match.home_team},away_team.eq.${match.away_team}),and(home_team.eq.${match.away_team},away_team.eq.${match.home_team})` }],
            order: 'match_date.desc',
            limit: 10
          }).catch(() => [])
        : []
    ]);

    return {
      match,
      prediction: prediction[0] ?? null,
      odds: odds[0] ?? null,
      weather: weather[0] ?? null,
      market: market[0] ?? null,
      injuries: injuryRows,
      h2h_matches: h2hRows,
    };
  }

  async dataAsOf() {
    const rows = await db.query('matches', { select: ['scraped_at'], order: 'scraped_at.desc', limit: 1 });
    return rows[0]?.scraped_at ?? null;
  }
}

// ---------------------------------------------------------------------------
// League Repository
// ---------------------------------------------------------------------------
class CloudLeagueRepository {
  async directory() {
    const rows = await db.rpc('get_league_directory');
    return (rows || []).map((r) => ({
      league: r.league,
      season: r.season,
      type: inferCompetitionType(r.league),
      teamCount: r.team_count ?? null,
      fixtureCount: r.fixture_count ?? 0,
      predictionCount: r.prediction_count ?? 0,
    }));
  }

  async latestSeason(league) {
    const rows = await db.query('matches', {
      select: ['season'],
      conditions: [{ col: 'league', op: 'eq', val: league }],
      order: 'season.desc',
      limit: 1,
    });
    return rows[0]?.season ?? null;
  }

  async seasonsFor(league) {
    const rows = await db.query('matches', {
      select: ['season'],
      conditions: [{ col: 'league', op: 'eq', val: league }],
      order: 'season.desc',
    });
    return [...new Set(rows.map((r) => r.season).filter(Boolean))];
  }

  async standings(league, season) {
    return db.rpc('get_league_standings', { p_league: league, p_season: season });
  }

  async overview(league, season) {
    const [fixtureCount, teamCount, predictionCount] = await Promise.all([
      db.count('matches', [{ col: 'league', op: 'eq', val: league }, { col: 'season', op: 'eq', val: season }]),
      db.count('team_stats', [{ col: 'league', op: 'eq', val: league }, { col: 'season', op: 'eq', val: season }]),
      db.count('prediction_log', [{ col: 'league', op: 'eq', val: league }, { col: 'season', op: 'eq', val: season }]),
    ]);
    return { fixtureCount, teamCount, predictionCount };
  }

  async fixturesPage(league, fromDateStr, { page = 1, pageSize = 20 } = {}) {
    return paginate('matches', {
      conditions: [
        { col: 'league',     op: 'eq',  val: league },
        { col: 'match_date', op: 'gte', val: fromDateStr },
      ],
      order: 'match_date.asc',
      page, pageSize,
    });
  }

  async resultsPage(league, { season, team, page = 1, pageSize = 20 } = {}) {
    const conditions = [
      { col: 'league',     op: 'eq',     val: league },
      { col: 'home_score', op: 'not.is', val: 'null' },
    ];
    if (season) conditions.push({ col: 'season', op: 'eq', val: season });
    return paginate('matches', { conditions, order: 'match_date.desc', page, pageSize });
  }

  async statistics(league, season) {
    const result = await db.rpc('get_league_statistics', { p_league: league, p_season: season });
    return result ?? {};
  }

  async oddsPage(league, { page = 1, pageSize = 20 } = {}) {
    if (db.rowCount('match_odds') === 0) return { rows: [], total: 0, page, pageSize, totalPages: 1 };
    return paginate('match_odds', {
      conditions: [{ col: 'league', op: 'eq', val: league }],
      order: 'match_date.desc',
      page, pageSize,
    });
  }

  async predictionDistribution(league, season) {
    const result = await db.rpc('get_prediction_distribution', { p_league: league, p_season: season });
    if (!result) return null;
    // RPC returns JSON object directly
    const d = typeof result === 'string' ? JSON.parse(result) : result;
    return {
      total: d.total ?? 0,
      graded: d.graded ?? 0,
      byOutcome: d.byOutcome ?? [],
      byConfidence: d.byConfidence ?? [],
    };
  }
}

// ---------------------------------------------------------------------------
// Team Repository
// ---------------------------------------------------------------------------
class CloudTeamRepository {
  async latestSeason() {
    const rows = await db.query('team_stats', { select: ['season'], order: 'season.desc', limit: 1 });
    return rows[0]?.season ?? null;
  }

  async directory({ league = null, season = null } = {}) {
    const effectiveSeason = season === 'all' ? null : season || await this.latestSeason();
    const conditions = [];
    if (league) conditions.push({ col: 'league', op: 'eq', val: league });
    if (effectiveSeason) conditions.push({ col: 'season', op: 'eq', val: effectiveSeason });

    if (db.rowCount('team_stats') > 0) {
      return db.query('team_stats', {
        select: ['team','league','season','points','wins','draws','losses','games_played','win_rate'],
        conditions,
        order: 'league.asc,points.desc',
        limit: 2000,
      });
    }
    // Fallback: derive from matches
    const matches = await db.query('matches', { select: ['home_team','away_team','league'], limit: 5000 });
    const seen = new Map();
    for (const m of matches) {
      for (const team of [m.home_team, m.away_team]) {
        if (team && !seen.has(`${team}|${m.league}`)) {
          seen.set(`${team}|${m.league}`, { team, league: m.league, season: null, points: null });
        }
      }
    }
    return [...seen.values()];
  }

  async statsFor(team, season = null) {
    const conditions = [{ col: 'team', op: 'eq', val: team }];
    if (season) conditions.push({ col: 'season', op: 'eq', val: season });
    const rows = await db.query('team_stats', { conditions, order: 'season.desc', limit: 1 });
    return rows[0] ?? null;
  }

  async recentForm(team, limit = 5) {
    const rows = await db.query('matches', {
      conditions: [
        { col: 'or',         op: '',       val: `(home_team.eq.${team},away_team.eq.${team})` },
        { col: 'home_score', op: 'not.is', val: 'null' },
      ],
      order: 'match_date.desc',
      limit,
    });
    return rows;
  }

  async upcomingFixtures(team, fromDateStr, limit = 5) {
    return db.query('matches', {
      conditions: [
        { col: 'or',         op: '',    val: `(home_team.eq.${team},away_team.eq.${team})` },
        { col: 'match_date', op: 'gte', val: fromDateStr },
      ],
      order: 'match_date.asc',
      limit,
    });
  }

  async fixturesPage(team, fromDateStr, { page = 1, pageSize = 20 } = {}) {
    return paginate('matches', {
      conditions: [
        { col: 'or',         op: '',    val: `(home_team.eq.${team},away_team.eq.${team})` },
        { col: 'match_date', op: 'gte', val: fromDateStr },
      ],
      order: 'match_date.asc',
      page, pageSize,
    });
  }

  async resultsFor(team, { season, league, result, dateFrom, dateTo, page = 1, pageSize = 20 } = {}) {
    const rows = await db.rpc('get_team_results', {
      p_team:   team,
      p_season: season ?? null,
      p_league: league ?? null,
      p_result: result ?? null,
      p_limit:  pageSize,
      p_offset: (page - 1) * pageSize,
    });
    const total = await db.count('matches', [
      { col: 'or',         op: '',       val: `(home_team.eq.${team},away_team.eq.${team})` },
      { col: 'home_score', op: 'not.is', val: 'null' },
    ]);
    return { rows: rows ?? [], total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async predictionsFor(team, { page = 1, pageSize = 20 } = {}) {
    return paginate('prediction_log', {
      conditions: [{ col: 'or', op: '', val: `(home_team.eq.${team},away_team.eq.${team})` }],
      order: 'match_date.desc',
      page, pageSize,
    });
  }

  async oddsFor(team, { page = 1, pageSize = 20 } = {}) {
    if (db.rowCount('match_odds') === 0) return { rows: [], total: 0, page, pageSize, totalPages: 1 };
    return paginate('match_odds', {
      conditions: [{ col: 'or', op: '', val: `(home_team.eq.${team},away_team.eq.${team})` }],
      order: 'match_date.desc',
      page, pageSize,
    });
  }

  async leaguesFor(team) {
    const rows = await db.query('matches', {
      select: ['league'],
      conditions: [{ col: 'or', op: '', val: `(home_team.eq.${team},away_team.eq.${team})` }],
      order: 'league.asc',
    });
    return [...new Set(rows.map((r) => r.league).filter(Boolean))];
  }

  async seasonsFor(team) {
    const rows = await db.query('matches', {
      select: ['season'],
      conditions: [{ col: 'or', op: '', val: `(home_team.eq.${team},away_team.eq.${team})` }],
      order: 'season.desc',
    });
    return [...new Set(rows.map((r) => r.season).filter(Boolean))];
  }

  async squad(team, season = null) {
    const conditions = [{ col: 'team', op: 'eq', val: team }];
    if (season) conditions.push({ col: 'season', op: 'eq', val: season });
    return db.query('players', { conditions, order: 'season.desc,position.asc,player.asc', limit: 500 });
  }

  async seasonHistory(team) {
    return db.query('team_stats', {
      conditions: [{ col: 'team', op: 'eq', val: team }],
      order: 'season.desc',
      limit: 20,
    });
  }
}

// ---------------------------------------------------------------------------
// Player Repository
// ---------------------------------------------------------------------------
class CloudPlayerRepository {
  async latestSeason() {
    const rows = await db.query('players', { select: ['season'], order: 'season.desc', limit: 1 });
    return rows[0]?.season ?? null;
  }

  async directory({ league = null, season = null, team = null, position = null, search = null, page = 1, pageSize = 30 } = {}) {
    const effectiveSeason = season === 'all' ? null : season || await this.latestSeason();
    const conditions = [];
    if (league)          conditions.push({ col: 'league',   op: 'eq',    val: league });
    if (effectiveSeason) conditions.push({ col: 'season',   op: 'eq',    val: effectiveSeason });
    if (team)            conditions.push({ col: 'team',     op: 'eq',    val: team });
    if (position)        conditions.push({ col: 'position', op: 'eq',    val: position });
    if (search)          conditions.push({ col: 'player',   op: 'ilike', val: search });
    return paginate('players', { conditions, order: 'goals.desc,player.asc', page, pageSize });
  }

  async profileRows(player) {
    return db.query('players', {
      conditions: [{ col: 'player', op: 'eq', val: player }],
      order: 'season.desc,team.asc',
      limit: 50,
    });
  }

  async latestRowFor(player) {
    const rows = await db.query('players', {
      conditions: [{ col: 'player', op: 'eq', val: player }],
      order: 'season.desc,updated_at.desc',
      limit: 1,
    });
    return rows[0] ?? null;
  }

  async leaguesFor(player) {
    const rows = await db.query('players', {
      select: ['league'],
      conditions: [{ col: 'player', op: 'eq', val: player }],
      order: 'league.asc',
    });
    return [...new Set(rows.map((r) => r.league).filter(Boolean))];
  }

  async distinctLeagues() {
    const rows = await db.query('players', { select: ['league'], order: 'league.asc', limit: 5000 });
    return [...new Set(rows.map((r) => r.league).filter(Boolean))];
  }

  async distinctPositions() {
    const rows = await db.query('players', {
      select: ['position'],
      conditions: [{ col: 'position', op: 'not.is', val: 'null' }],
      order: 'position.asc',
      limit: 100,
    });
    return [...new Set(rows.map((r) => r.position).filter(Boolean))];
  }

  matchAppearances() {
    return { available: false, rows: [] };
  }
}

// ---------------------------------------------------------------------------
// Prediction Repository
// ---------------------------------------------------------------------------
class CloudPredictionRepository {
  async filterPredictions({ league, status, market, confidence, engine = 'consensus', engineCorrect, page = 1, pageSize = 25 } = {}) {
    const conditions = [];
    if (league)     conditions.push({ col: 'league',           op: 'eq', val: league });
    if (status)     conditions.push({ col: 'status',           op: 'eq', val: status });
    if (market)     conditions.push({ col: 'consensus_outcome',op: 'eq', val: market });
    if (confidence) conditions.push({ col: 'confidence',       op: 'eq', val: confidence });
    if (engineCorrect !== undefined && engineCorrect !== '' && engineCorrect !== null) {
      const col = `${engine}_correct`;
      const val = (engineCorrect === 'true' || engineCorrect === true) ? 1 : 0;
      conditions.push({ col, op: 'eq', val: String(val) });
    }
    return paginate('prediction_log', { conditions, order: 'match_date.desc', page, pageSize });
  }

  async exportRows({ league, status, market, confidence, engine = 'consensus', engineCorrect, limit = 5000 } = {}) {
    const { rows } = await this.filterPredictions({ league, status, market, confidence, engine, engineCorrect, page: 1, pageSize: limit });
    return rows;
  }

  async maxValueGap() {
    const result = await db.rpc('get_max_value_gap');
    return typeof result === 'number' ? result : null;
  }

  async distinctLeagues() {
    const rows = await db.query('prediction_log', {
      select: ['league'],
      conditions: [{ col: 'league', op: 'not.is', val: 'null' }],
      order: 'league.asc',
      limit: 5000,
    });
    return [...new Set(rows.map((r) => r.league).filter(Boolean))];
  }

  async distinctMarkets() {
    const rows = await db.query('prediction_log', {
      select: ['consensus_outcome'],
      conditions: [{ col: 'consensus_outcome', op: 'not.is', val: 'null' }],
      order: 'consensus_outcome.asc',
      limit: 100,
    });
    return [...new Set(rows.map((r) => r.consensus_outcome).filter(Boolean))];
  }

  async distinctConfidences() {
    const rows = await db.query('prediction_log', {
      select: ['confidence'],
      conditions: [{ col: 'confidence', op: 'not.is', val: 'null' }],
      order: 'confidence.asc',
      limit: 20,
    });
    return [...new Set(rows.map((r) => r.confidence).filter(Boolean))];
  }

  async engineAccuracy({ league = null } = {}) {
    return db.rpc('get_engine_accuracy', { p_league: league ?? null });
  }

  async accuracyOverTime({ league = null } = {}) {
    return db.rpc('get_accuracy_over_time', { p_league: league ?? null });
  }

  async calibrationCurve({ league = null } = {}) {
    return db.rpc('get_calibration_curve', { p_league: league ?? null });
  }

  async engineWeightHistory() {
    return db.query('engine_weights', { order: 'computed_at.asc', limit: 100 });
  }

  async valueBets({ minConfidenceTier = 'Medium', minValueGap = 0, fromDate, limit = 50 } = {}) {
    const tierRank = { Low: 0, Medium: 1, High: 2 };
    const acceptedTiers = Object.keys(tierRank).filter((t) => tierRank[t] >= (tierRank[minConfidenceTier] ?? 1));
    const conditions = [
      { col: 'confidence',    op: 'in',  val: acceptedTiers },
      { col: 'value_gap_home', op: 'gte', val: String(minValueGap) },
    ];
    if (fromDate) conditions.push({ col: 'match_date', op: 'gte', val: fromDate });
    // Ordering by confidence tier then value gap — use RPC for complex ORDER BY
    return db.query('prediction_log', { conditions, order: 'match_date.desc', limit });
  }
}

// ---------------------------------------------------------------------------
// Odds Repository
// ---------------------------------------------------------------------------
class CloudOddsRepository {
  async matchOddsQuery({ league, page = 1, pageSize = 25 } = {}) {
    if (db.rowCount('match_odds') === 0) return { rows: [], total: 0, page, pageSize, totalPages: 1 };
    const conditions = league ? [{ col: 'league', op: 'eq', val: league }] : [];
    return paginate('match_odds', { conditions, order: 'match_date.desc', page, pageSize });
  }

  async fortebetOddsQuery({ league, page = 1, pageSize = 25 } = {}) {
    if (db.rowCount('fortebet_odds') === 0) return { rows: [], total: 0, page, pageSize, totalPages: 1 };
    const conditions = league ? [{ col: 'league', op: 'eq', val: league }] : [];
    return paginate('fortebet_odds', { conditions, order: 'match_date.desc', page, pageSize });
  }

  async exportMatchOdds({ league, limit = 5000 } = {}) {
    return (await this.matchOddsQuery({ league, page: 1, pageSize: limit })).rows;
  }

  async exportFortebetOdds({ league, limit = 5000 } = {}) {
    return (await this.fortebetOddsQuery({ league, page: 1, pageSize: limit })).rows;
  }

  async distinctMatchOddsLeagues() {
    const rows = await db.query('match_odds', {
      select: ['league'],
      conditions: [{ col: 'league', op: 'not.is', val: 'null' }],
      order: 'league.asc',
      limit: 500,
    });
    return [...new Set(rows.map((r) => r.league).filter(Boolean))];
  }

  async distinctFortebetLeagues() {
    const rows = await db.query('fortebet_odds', {
      select: ['league'],
      conditions: [{ col: 'league', op: 'not.is', val: 'null' }],
      order: 'league.asc',
      limit: 500,
    });
    return [...new Set(rows.map((r) => r.league).filter(Boolean))];
  }
}

// ---------------------------------------------------------------------------
// Logo Repository
// ---------------------------------------------------------------------------
class CloudLogoRepository {
  async getTeamLogo(team, league) {
    const rows = await db.query('team_logos', {
      select: ['logo_url'],
      conditions: [
        { col: 'team',   op: 'eq', val: team },
        { col: 'league', op: 'eq', val: league },
      ],
      limit: 1,
    });
    return rows[0]?.logo_url ?? null;
  }
}

// ---------------------------------------------------------------------------
// Utility: competition type inference (same as leagueRepository.js)
// ---------------------------------------------------------------------------
function inferCompetitionType(name = '') {
  const n = name.toLowerCase();
  if (/\bwomen'?s?\b|\bfemenino\b|\bfeminine\b|\bdamallsvenskan\b/.test(n)) return "Women's";
  if (/\bu1[5-9]\b|\bu2[0-3]\b|\byouth\b|\bacademy\b|\bjunior\b/.test(n)) return 'Youth';
  if (/\bcup\b|\btrophy\b|\bshield\b|\bcopa\b|\bcoupe\b|\bpokal\b/.test(n)) return 'Cup';
  if (/\bchampions league\b|\beuropa\b|\bworld cup\b|\beuro\b|\buefa\b|\bconmebol\b|\bconcacaf\b|\bcaf\b|\bafc\b|\bnations league\b/.test(n))
    return 'International';
  return 'Domestic League';
}

// ---------------------------------------------------------------------------
// Exports — drop-in replacements for the SQLite repository singletons
// ---------------------------------------------------------------------------
export const matchRepository      = new CloudMatchRepository();
export const leagueRepository     = new CloudLeagueRepository();
export const teamRepository       = new CloudTeamRepository();
export const playerRepository     = new CloudPlayerRepository();
export const predictionRepository = new CloudPredictionRepository();
export const oddsRepository       = new CloudOddsRepository();
export const logoRepository       = new CloudLogoRepository();
