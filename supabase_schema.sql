-- ============================================================
-- PlusOne Analytics — Supabase PostgreSQL Schema
-- Run this entire file in the Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- Enable trigram extension for fast player-name search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 1. CORE DATA TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS matches (
  id           TEXT PRIMARY KEY,
  home_team    TEXT,
  away_team    TEXT,
  league       TEXT,
  season       TEXT,
  match_date   TEXT,
  gameweek     INTEGER,
  start_time   TEXT,
  home_score   INTEGER,
  away_score   INTEGER,
  home_xg      REAL,
  away_xg      REAL,
  scraped_at   TEXT
);

CREATE TABLE IF NOT EXISTS prediction_log (
  id                      TEXT PRIMARY KEY,
  match_id                TEXT REFERENCES matches(id) ON DELETE CASCADE,
  home_team               TEXT,
  away_team               TEXT,
  league                  TEXT,
  match_date              TEXT,
  season                  TEXT,
  dc_outcome              TEXT,
  dc_home_prob            REAL,
  dc_draw_prob            REAL,
  dc_away_prob            REAL,
  ml_outcome              TEXT,
  ml_home_prob            REAL,
  ml_draw_prob            REAL,
  ml_away_prob            REAL,
  legacy_outcome          TEXT,
  legacy_home_prob        REAL,
  legacy_draw_prob        REAL,
  legacy_away_prob        REAL,
  consensus_outcome       TEXT,
  consensus_home_prob     REAL,
  consensus_draw_prob     REAL,
  consensus_away_prob     REAL,
  best_bet_outcome        TEXT,
  best_bet_correct        INTEGER,
  second_best_bet_outcome TEXT,
  second_best_bet_correct INTEGER,
  engine_agreement        TEXT,
  value_gap_home          REAL,
  value_gap_draw          REAL,
  value_gap_away          REAL,
  calibrated_prob         REAL,
  dc_expected_home        REAL,
  dc_expected_away        REAL,
  h2h_home_wins           INTEGER,
  h2h_draws               INTEGER,
  h2h_away_wins           INTEGER,
  h2h_total               INTEGER,
  h2h_home_rate           REAL,
  h2h_avg_goals           REAL,
  confidence              TEXT,
  actual_home_score       INTEGER,
  actual_away_score       INTEGER,
  actual_outcome          TEXT,
  dc_correct              INTEGER,
  ml_correct              INTEGER,
  legacy_correct          INTEGER,
  consensus_correct       INTEGER,
  predicted_at            TEXT,
  evaluated_at            TEXT,
  status                  TEXT,
  score_pred_1            TEXT,
  score_prob_1            REAL,
  score_pred_2            TEXT,
  score_prob_2            REAL,
  score_pred_3            TEXT,
  score_prob_3            REAL,
  score_pred_correct      INTEGER
);

CREATE TABLE IF NOT EXISTS market_predictions (
  id                      TEXT PRIMARY KEY,
  match_id                TEXT REFERENCES matches(id) ON DELETE CASCADE,
  home_team               TEXT,
  away_team               TEXT,
  league                  TEXT,
  match_date              TEXT,
  expected_home           REAL,
  expected_away           REAL,
  over_05                 REAL,
  under_05                REAL,
  over_15                 REAL,
  under_15                REAL,
  over_25                 REAL,
  under_25                REAL,
  over_35                 REAL,
  under_35                REAL,
  btts_yes                REAL,
  btts_no                 REAL,
  dc_1x                   REAL,
  dc_12                   REAL,
  dc_x2                   REAL,
  dc_label                TEXT,
  home_to_score           REAL,
  away_to_score           REAL,
  best_bet_outcome        TEXT,
  best_bet_prob           REAL,
  best_bet_score          REAL,
  best_bet_correct        INTEGER,
  second_best_bet_outcome TEXT,
  second_best_bet_prob    REAL,
  second_best_bet_score   REAL,
  second_best_bet_correct INTEGER,
  over_05_correct         INTEGER,
  over_15_correct         INTEGER,
  over_25_correct         INTEGER,
  over_35_correct         INTEGER,
  btts_correct            INTEGER,
  dc_correct              INTEGER,
  home_to_score_correct   INTEGER,
  away_to_score_correct   INTEGER,
  predicted_at            TEXT,
  evaluated_at            TEXT,
  status                  TEXT
);

CREATE TABLE IF NOT EXISTS players (
  id                   TEXT PRIMARY KEY,
  player               TEXT,
  team                 TEXT,
  league               TEXT,
  season               TEXT,
  nationality          TEXT,
  position             TEXT,
  age                  INTEGER,
  games                INTEGER,
  games_starts         INTEGER,
  minutes              INTEGER,
  goals                REAL,
  assists              REAL,
  goals_per90          REAL,
  assists_per90        REAL,
  cards_yellow         INTEGER,
  cards_red            INTEGER,
  xg                   REAL,
  xg_per90             REAL,
  xa                   REAL,
  xa_per90             REAL,
  progressive_carries  INTEGER,
  progressive_passes   INTEGER,
  updated_at           TEXT
);

CREATE TABLE IF NOT EXISTS team_stats (
  id                  TEXT PRIMARY KEY,
  team                TEXT NOT NULL,
  league              TEXT NOT NULL,
  season              TEXT,
  goals_scored        REAL,
  goals_conceded      REAL,
  goals_per_game      REAL,
  conceded_per_game   REAL,
  attack_strength     REAL,
  defence_weakness    REAL,
  home_goals_pg       REAL,
  away_goals_pg       REAL,
  home_conceded_pg    REAL,
  away_conceded_pg    REAL,
  form_score          REAL,
  wins                INTEGER,
  draws               INTEGER,
  losses              INTEGER,
  games_played        INTEGER,
  clean_sheets        INTEGER,
  win_rate            REAL,
  points              INTEGER,
  possession_avg      REAL,
  shots_on_target_pg  REAL,
  xg_per_game         REAL,
  xg_against_pg       REAL,
  updated_at          TEXT
);

CREATE TABLE IF NOT EXISTS team_injuries (
  id            TEXT PRIMARY KEY,
  league        TEXT,
  club          TEXT,
  player        TEXT,
  position      TEXT,
  injury        TEXT,
  return_date   TEXT,
  market_value  TEXT,
  scraped_date  TEXT,
  updated_at    TEXT
);

-- ============================================================
-- 2. ODDS TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS match_odds (
  id          TEXT PRIMARY KEY,
  home_team   TEXT,
  away_team   TEXT,
  league      TEXT,
  season      TEXT,
  match_date  TEXT,
  odds_home   REAL,
  odds_draw   REAL,
  odds_away   REAL,
  bookmaker   TEXT,
  scraped_at  TEXT
);

CREATE TABLE IF NOT EXISTS fortebet_odds (
  id          TEXT PRIMARY KEY,
  home_team   TEXT,
  away_team   TEXT,
  league      TEXT,
  season      TEXT,
  match_date  TEXT,
  odds_home   REAL,
  odds_draw   REAL,
  odds_away   REAL,
  scraped_at  TEXT
);

-- ============================================================
-- 3. REFERENCE / METADATA TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS team_logos (
  id          TEXT PRIMARY KEY,
  team        TEXT,
  league      TEXT,
  logo_url    TEXT,
  scraped_at  TEXT,
  updated_at  TEXT
);

CREATE TABLE IF NOT EXISTS league_logos (
  league      TEXT PRIMARY KEY,
  logo_url    TEXT,
  scraped_at  TEXT,
  updated_at  TEXT
);

CREATE TABLE IF NOT EXISTS discovered_leagues (
  comps_id        TEXT PRIMARY KEY,
  name            TEXT,
  slug_base       TEXT,
  country_code    TEXT,
  gender          TEXT,
  tier            TEXT,
  current_season  TEXT,
  is_selected     INTEGER DEFAULT 1,
  discovered_at   TEXT,
  updated_at      TEXT
);

CREATE TABLE IF NOT EXISTS league_params (
  id          SERIAL PRIMARY KEY,
  league      TEXT,
  param_key   TEXT,
  param_value TEXT,
  updated_at  TEXT,
  UNIQUE(league, param_key)
);

CREATE TABLE IF NOT EXISTS engine_weights (
  id            SERIAL PRIMARY KEY,
  dc_weight     REAL,
  ml_weight     REAL,
  legacy_weight REAL,
  source        TEXT,
  sample_size   INTEGER,
  naive_rate    REAL,
  computed_at   TEXT
);

CREATE TABLE IF NOT EXISTS key_value (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS team_name_aliases (
  raw_name       TEXT PRIMARY KEY,
  canonical_name TEXT,
  score          REAL,
  resolved_at    TEXT
);

-- ============================================================
-- 4. HISTORICAL / EXTENDED TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS historical_results (
  id           TEXT PRIMARY KEY,
  home_team    TEXT,
  away_team    TEXT,
  league       TEXT,
  season       TEXT,
  match_date   TEXT,
  home_score   INTEGER,
  away_score   INTEGER,
  home_yellow  INTEGER,
  away_yellow  INTEGER,
  home_corners INTEGER,
  away_corners INTEGER,
  scraped_at   TEXT
);

CREATE TABLE IF NOT EXISTS match_weather (
  id              TEXT PRIMARY KEY,
  home_team       TEXT,
  away_team       TEXT,
  league          TEXT,
  match_date      TEXT,
  temperature_c   REAL,
  condition       TEXT,
  wind_kmh        REAL,
  humidity_pct    REAL,
  scraped_at      TEXT
);

CREATE TABLE IF NOT EXISTS referees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  league TEXT,
  season TEXT,
  matches INTEGER DEFAULT 0,
  home_win_pct REAL DEFAULT 0.45,
  draw_pct REAL DEFAULT 0.27,
  away_win_pct REAL DEFAULT 0.28,
  yellow_cards_pg REAL DEFAULT 3.5,
  red_cards_pg REAL DEFAULT 0.2,
  penalties_pg REAL DEFAULT 0.3,
  home_bias_score REAL DEFAULT 0.0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS match_referees (
  id          TEXT PRIMARY KEY,
  match_id    TEXT REFERENCES matches(id) ON DELETE CASCADE,
  league      TEXT,
  match_date  TEXT,
  home_team   TEXT,
  away_team   TEXT,
  referee     TEXT,
  scraped_at  TEXT
);

CREATE TABLE IF NOT EXISTS team_lineups (
  id           TEXT PRIMARY KEY,
  match_id     TEXT REFERENCES matches(id) ON DELETE CASCADE,
  team         TEXT,
  league       TEXT,
  match_date   TEXT,
  formation    TEXT,
  players_json TEXT,
  scraped_at   TEXT
);

CREATE TABLE IF NOT EXISTS understat_team_stats (
  id             TEXT PRIMARY KEY,
  league         TEXT NOT NULL,
  season         TEXT NOT NULL,
  team           TEXT NOT NULL,
  games          INTEGER,
  xg_per_game    REAL,
  xga_per_game   REAL,
  npxg_per_game  REAL,
  npxga_per_game REAL,
  scraped_at     TEXT
);

CREATE TABLE IF NOT EXISTS scraper_health (
  id         SERIAL PRIMARY KEY,
  league     TEXT,
  scraper    TEXT,
  status     TEXT,
  message    TEXT,
  checked_at TEXT
);

CREATE TABLE IF NOT EXISTS live_standings (
  id         TEXT PRIMARY KEY,
  league     TEXT,
  season     TEXT,
  scraped_at TEXT
);

CREATE TABLE IF NOT EXISTS live_standings_rows (
  id            TEXT PRIMARY KEY,
  standings_id  TEXT REFERENCES live_standings(id) ON DELETE CASCADE,
  position      INTEGER,
  team          TEXT,
  played        INTEGER,
  won           INTEGER,
  drawn         INTEGER,
  lost          INTEGER,
  goals_for     INTEGER,
  goals_against INTEGER,
  goal_diff     INTEGER,
  points        INTEGER
);

CREATE TABLE IF NOT EXISTS live_match_metadata (
  id         TEXT PRIMARY KEY,
  match_id   TEXT REFERENCES matches(id) ON DELETE CASCADE,
  status     TEXT,
  minute     INTEGER,
  home_score INTEGER,
  away_score INTEGER,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS live_h2h_matches (
  id         TEXT PRIMARY KEY,
  home_team  TEXT,
  away_team  TEXT,
  league     TEXT,
  match_date TEXT,
  home_score INTEGER,
  away_score INTEGER,
  season     TEXT
);

CREATE TABLE IF NOT EXISTS live_venues (
  id         TEXT PRIMARY KEY,
  team       TEXT,
  league     TEXT,
  venue_name TEXT,
  capacity   INTEGER,
  city       TEXT,
  country    TEXT,
  scraped_at TEXT
);

CREATE TABLE IF NOT EXISTS league_mappings (
  id             TEXT PRIMARY KEY,
  source_name    TEXT,
  canonical_name TEXT,
  source         TEXT,
  resolved_at    TEXT
);

CREATE TABLE IF NOT EXISTS clubelo_fixtures (
  id         TEXT PRIMARY KEY,
  home_team  TEXT,
  away_team  TEXT,
  league     TEXT,
  match_date TEXT,
  home_elo   REAL,
  away_elo   REAL,
  scraped_at TEXT
);

CREATE TABLE IF NOT EXISTS fortebet_match_bridge (
  id          TEXT PRIMARY KEY,
  fortebet_id TEXT,
  match_id    TEXT REFERENCES matches(id) ON DELETE CASCADE,
  matched_at  TEXT
);

-- ============================================================
-- 5. PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_matches_league        ON matches(league);
CREATE INDEX IF NOT EXISTS idx_matches_date          ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_season        ON matches(season);
CREATE INDEX IF NOT EXISTS idx_matches_home          ON matches(home_team);
CREATE INDEX IF NOT EXISTS idx_matches_away          ON matches(away_team);
CREATE INDEX IF NOT EXISTS idx_matches_league_season ON matches(league, season);

CREATE INDEX IF NOT EXISTS idx_pred_match   ON prediction_log(match_id);
CREATE INDEX IF NOT EXISTS idx_pred_league  ON prediction_log(league);
CREATE INDEX IF NOT EXISTS idx_pred_date    ON prediction_log(match_date);
CREATE INDEX IF NOT EXISTS idx_pred_status  ON prediction_log(status);

CREATE INDEX IF NOT EXISTS idx_mkt_match   ON market_predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_mkt_league  ON market_predictions(league);

CREATE INDEX IF NOT EXISTS idx_players_league   ON players(league);
CREATE INDEX IF NOT EXISTS idx_players_team     ON players(team);
CREATE INDEX IF NOT EXISTS idx_players_season   ON players(season);
CREATE INDEX IF NOT EXISTS idx_players_name     ON players(player);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_players_name_trgm ON players USING gin(player gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_team_stats_league ON team_stats(league);
CREATE INDEX IF NOT EXISTS idx_team_stats_team   ON team_stats(team);
CREATE INDEX IF NOT EXISTS idx_team_stats_season ON team_stats(season);

CREATE INDEX IF NOT EXISTS idx_injuries_league ON team_injuries(league);
CREATE INDEX IF NOT EXISTS idx_injuries_club   ON team_injuries(club);

CREATE INDEX IF NOT EXISTS idx_odds_league ON match_odds(league);
CREATE INDEX IF NOT EXISTS idx_odds_date   ON match_odds(match_date);

CREATE INDEX IF NOT EXISTS idx_logos_team   ON team_logos(team);
CREATE INDEX IF NOT EXISTS idx_logos_league ON team_logos(league);

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- Anonymous users can SELECT. Only service_role can write.
-- ============================================================

ALTER TABLE matches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players            ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_stats         ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_injuries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_odds         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fortebet_odds      ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_logos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_logos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_params      ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_weights     ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_value          ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_name_aliases  ENABLE ROW LEVEL SECURITY;
ALTER TABLE referees           ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "anon_read_matches"            ON matches            FOR SELECT USING (true);
CREATE POLICY "anon_read_prediction_log"     ON prediction_log     FOR SELECT USING (true);
CREATE POLICY "anon_read_market_predictions" ON market_predictions FOR SELECT USING (true);
CREATE POLICY "anon_read_players"            ON players            FOR SELECT USING (true);
CREATE POLICY "anon_read_team_stats"         ON team_stats         FOR SELECT USING (true);
CREATE POLICY "anon_read_team_injuries"      ON team_injuries      FOR SELECT USING (true);
CREATE POLICY "anon_read_match_odds"         ON match_odds         FOR SELECT USING (true);
CREATE POLICY "anon_read_fortebet_odds"      ON fortebet_odds      FOR SELECT USING (true);
CREATE POLICY "anon_read_team_logos"         ON team_logos         FOR SELECT USING (true);
CREATE POLICY "anon_read_league_logos"       ON league_logos       FOR SELECT USING (true);
CREATE POLICY "anon_read_discovered_leagues" ON discovered_leagues FOR SELECT USING (true);
CREATE POLICY "anon_read_league_params"      ON league_params      FOR SELECT USING (true);
CREATE POLICY "anon_read_engine_weights"     ON engine_weights     FOR SELECT USING (true);
CREATE POLICY "anon_read_key_value"          ON key_value          FOR SELECT USING (true);
CREATE POLICY "anon_read_historical_results" ON historical_results FOR SELECT USING (true);
CREATE POLICY "anon_read_team_name_aliases"  ON team_name_aliases  FOR SELECT USING (true);
CREATE POLICY "anon_read_referees"           ON referees           FOR SELECT USING (true);

-- ============================================================
-- 7. RPC FUNCTIONS (called by the web app for complex queries)
-- ============================================================

-- League standings with position rank
CREATE OR REPLACE FUNCTION get_league_standings(p_league TEXT, p_season TEXT)
RETURNS TABLE (
  id TEXT, team TEXT, league TEXT, season TEXT,
  goals_scored REAL, goals_conceded REAL, goals_per_game REAL, conceded_per_game REAL,
  attack_strength REAL, defence_weakness REAL, home_goals_pg REAL, away_goals_pg REAL,
  home_conceded_pg REAL, away_conceded_pg REAL, form_score REAL,
  wins INTEGER, draws INTEGER, losses INTEGER, games_played INTEGER,
  clean_sheets INTEGER, win_rate REAL, points INTEGER,
  possession_avg REAL, shots_on_target_pg REAL, xg_per_game REAL, xg_against_pg REAL,
  updated_at TEXT, goal_diff REAL, position INTEGER
)
LANGUAGE SQL STABLE AS $$
  SELECT ts.*,
    (ts.goals_scored - ts.goals_conceded) AS goal_diff,
    ROW_NUMBER() OVER (
      ORDER BY ts.points DESC,
               (ts.goals_scored - ts.goals_conceded) DESC,
               ts.goals_scored DESC
    )::INTEGER AS position
  FROM team_stats ts
  WHERE ts.league = p_league AND ts.season = p_season
  ORDER BY ts.points DESC, (ts.goals_scored - ts.goals_conceded) DESC, ts.goals_scored DESC;
$$;

-- League statistics aggregate
CREATE OR REPLACE FUNCTION get_league_statistics(p_league TEXT, p_season TEXT)
RETURNS JSON LANGUAGE SQL STABLE AS $$
  SELECT row_to_json(q) FROM (
    SELECT
      COUNT(*) AS played,
      SUM(home_score + away_score) AS total_goals,
      SUM(CASE WHEN home_score > away_score THEN 1 ELSE 0 END) AS home_wins,
      SUM(CASE WHEN away_score > home_score THEN 1 ELSE 0 END) AS away_wins,
      SUM(CASE WHEN home_score = away_score THEN 1 ELSE 0 END) AS draws,
      SUM(CASE WHEN away_score = 0 THEN 1 ELSE 0 END) AS home_clean_sheets,
      SUM(CASE WHEN home_score = 0 THEN 1 ELSE 0 END) AS away_clean_sheets
    FROM matches
    WHERE league = p_league AND season = p_season AND home_score IS NOT NULL
  ) q;
$$;

-- Engine accuracy
CREATE OR REPLACE FUNCTION get_engine_accuracy(p_league TEXT DEFAULT NULL)
RETURNS TABLE (engine TEXT, sample_size BIGINT, accuracy FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT 'dc'::TEXT,
    COUNT(*),
    AVG(CASE WHEN dc_correct = 1 THEN 1.0 ELSE 0 END)
  FROM prediction_log
  WHERE status = 'graded' AND dc_correct IS NOT NULL
    AND (p_league IS NULL OR league = p_league)
  UNION ALL
  SELECT 'ml'::TEXT,
    COUNT(*),
    AVG(CASE WHEN ml_correct = 1 THEN 1.0 ELSE 0 END)
  FROM prediction_log
  WHERE status = 'graded' AND ml_correct IS NOT NULL
    AND (p_league IS NULL OR league = p_league)
  UNION ALL
  SELECT 'legacy'::TEXT,
    COUNT(*),
    AVG(CASE WHEN legacy_correct = 1 THEN 1.0 ELSE 0 END)
  FROM prediction_log
  WHERE status = 'graded' AND legacy_correct IS NOT NULL
    AND (p_league IS NULL OR league = p_league)
  UNION ALL
  SELECT 'consensus'::TEXT,
    COUNT(*),
    AVG(CASE WHEN consensus_correct = 1 THEN 1.0 ELSE 0 END)
  FROM prediction_log
  WHERE status = 'graded' AND consensus_correct IS NOT NULL
    AND (p_league IS NULL OR league = p_league);
$$;

-- Monthly accuracy over time
CREATE OR REPLACE FUNCTION get_accuracy_over_time(p_league TEXT DEFAULT NULL)
RETURNS TABLE (
  month TEXT,
  consensus_correct_rate FLOAT, dc_correct_rate FLOAT,
  ml_correct_rate FLOAT, legacy_correct_rate FLOAT,
  n BIGINT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    TO_CHAR(TO_DATE(match_date, 'YYYY-MM-DD'), 'YYYY-MM') AS month,
    AVG(CASE WHEN consensus_correct=1 THEN 1.0 WHEN consensus_correct=0 THEN 0.0 ELSE NULL END),
    AVG(CASE WHEN dc_correct=1 THEN 1.0 WHEN dc_correct=0 THEN 0.0 ELSE NULL END),
    AVG(CASE WHEN ml_correct=1 THEN 1.0 WHEN ml_correct=0 THEN 0.0 ELSE NULL END),
    AVG(CASE WHEN legacy_correct=1 THEN 1.0 WHEN legacy_correct=0 THEN 0.0 ELSE NULL END),
    COUNT(*)
  FROM prediction_log
  WHERE status = 'graded' AND (p_league IS NULL OR league = p_league)
  GROUP BY TO_CHAR(TO_DATE(match_date, 'YYYY-MM-DD'), 'YYYY-MM')
  ORDER BY month;
$$;

-- Calibration curve
CREATE OR REPLACE FUNCTION get_calibration_curve(p_league TEXT DEFAULT NULL)
RETURNS TABLE (bucket INTEGER, actual_frequency FLOAT, avg_stated_prob FLOAT, n BIGINT)
LANGUAGE SQL STABLE AS $$
  SELECT
    LEAST(9, FLOOR(stated_prob * 10)::INTEGER) AS bucket,
    AVG(actual_correct) AS actual_frequency,
    AVG(stated_prob) AS avg_stated_prob,
    COUNT(*) AS n
  FROM (
    SELECT
      CASE consensus_outcome
        WHEN 'Home Win' THEN consensus_home_prob
        WHEN 'Draw'     THEN consensus_draw_prob
        WHEN 'Away Win' THEN consensus_away_prob
      END AS stated_prob,
      consensus_correct AS actual_correct
    FROM prediction_log
    WHERE status = 'graded'
      AND consensus_outcome IS NOT NULL
      AND consensus_correct IS NOT NULL
      AND (p_league IS NULL OR league = p_league)
  ) sub
  WHERE stated_prob IS NOT NULL
  GROUP BY LEAST(9, FLOOR(stated_prob * 10)::INTEGER)
  ORDER BY bucket;
$$;

-- Team results with computed team_result field
CREATE OR REPLACE FUNCTION get_team_results(
  p_team   TEXT,
  p_season TEXT DEFAULT NULL,
  p_league TEXT DEFAULT NULL,
  p_result TEXT DEFAULT NULL,
  p_limit  INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id TEXT, home_team TEXT, away_team TEXT, league TEXT, season TEXT,
  match_date TEXT, gameweek INTEGER, start_time TEXT,
  home_score INTEGER, away_score INTEGER, home_xg REAL, away_xg REAL,
  scraped_at TEXT, team_result TEXT
)
LANGUAGE SQL STABLE AS $$
  SELECT *
  FROM (
    SELECT m.*,
      CASE
        WHEN m.home_team = p_team THEN
          CASE WHEN m.home_score > m.away_score THEN 'win'
               WHEN m.home_score = m.away_score THEN 'draw'
               ELSE 'loss' END
        ELSE
          CASE WHEN m.away_score > m.home_score THEN 'win'
               WHEN m.away_score = m.home_score THEN 'draw'
               ELSE 'loss' END
      END AS team_result
    FROM matches m
    WHERE (m.home_team = p_team OR m.away_team = p_team)
      AND m.home_score IS NOT NULL
  ) sub
  WHERE (p_season IS NULL OR season = p_season)
    AND (p_league IS NULL OR league = p_league)
    AND (p_result IS NULL OR team_result = p_result)
  ORDER BY match_date DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- Prediction distribution for a league/season
CREATE OR REPLACE FUNCTION get_prediction_distribution(p_league TEXT, p_season TEXT)
RETURNS JSON LANGUAGE SQL STABLE AS $$
  SELECT json_build_object(
    'total',   (SELECT COUNT(*) FROM prediction_log WHERE league=p_league AND season=p_season),
    'graded',  (SELECT COUNT(*) FROM prediction_log WHERE league=p_league AND season=p_season AND status='graded'),
    'byOutcome', (
      SELECT COALESCE(json_agg(row_to_json(q)), '[]') FROM (
        SELECT consensus_outcome AS outcome, COUNT(*) AS n
        FROM prediction_log
        WHERE league=p_league AND season=p_season AND consensus_outcome IS NOT NULL
        GROUP BY consensus_outcome ORDER BY n DESC
      ) q
    ),
    'byConfidence', (
      SELECT COALESCE(json_agg(row_to_json(q)), '[]') FROM (
        SELECT confidence, COUNT(*) AS n
        FROM prediction_log
        WHERE league=p_league AND season=p_season AND confidence IS NOT NULL
        GROUP BY confidence ORDER BY n DESC
      ) q
    )
  );
$$;

-- Max value gap (for Value Bets empty state)
CREATE OR REPLACE FUNCTION get_max_value_gap()
RETURNS FLOAT LANGUAGE SQL STABLE AS $$
  SELECT MAX(GREATEST(
    COALESCE(value_gap_home,0),
    COALESCE(value_gap_draw,0),
    COALESCE(value_gap_away,0)
  )) FROM prediction_log;
$$;

-- Home: fixtures for a date with predictions joined
CREATE OR REPLACE FUNCTION get_fixtures_for_date(p_date TEXT, p_league TEXT DEFAULT NULL)
RETURNS TABLE (
  id TEXT, home_team TEXT, away_team TEXT, league TEXT, season TEXT,
  match_date TEXT, gameweek INTEGER, start_time TEXT,
  home_score INTEGER, away_score INTEGER, home_xg REAL, away_xg REAL,
  scraped_at TEXT,
  pred_consensus_outcome TEXT, pred_consensus_home_prob REAL,
  pred_consensus_draw_prob REAL, pred_consensus_away_prob REAL,
  pred_confidence TEXT, pred_value_gap_home REAL, pred_value_gap_draw REAL,
  pred_value_gap_away REAL, pred_best_bet_outcome TEXT,
  pred_status TEXT, pred_predicted_at TEXT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    m.id, m.home_team, m.away_team, m.league, m.season,
    m.match_date, m.gameweek, m.start_time,
    m.home_score, m.away_score, m.home_xg, m.away_xg, m.scraped_at,
    p.consensus_outcome, p.consensus_home_prob, p.consensus_draw_prob,
    p.consensus_away_prob, p.confidence, p.value_gap_home,
    p.value_gap_draw, p.value_gap_away, p.best_bet_outcome,
    p.status, p.predicted_at
  FROM matches m
  LEFT JOIN prediction_log p ON p.match_id = m.id
  WHERE m.match_date = p_date
    AND (p_league IS NULL OR m.league = p_league)
  ORDER BY m.start_time ASC, m.league ASC;
$$;

-- Next fixture date on or after a given date
CREATE OR REPLACE FUNCTION get_next_fixture_date(p_from_date TEXT)
RETURNS TEXT LANGUAGE SQL STABLE AS $$
  SELECT match_date FROM matches
  WHERE match_date >= p_from_date
  ORDER BY match_date ASC LIMIT 1;
$$;

-- Grant anon execute on all RPC functions
GRANT EXECUTE ON FUNCTION get_league_standings      TO anon;
GRANT EXECUTE ON FUNCTION get_league_statistics     TO anon;
GRANT EXECUTE ON FUNCTION get_engine_accuracy       TO anon;
GRANT EXECUTE ON FUNCTION get_accuracy_over_time    TO anon;
GRANT EXECUTE ON FUNCTION get_calibration_curve     TO anon;
GRANT EXECUTE ON FUNCTION get_team_results          TO anon;
GRANT EXECUTE ON FUNCTION get_prediction_distribution TO anon;
GRANT EXECUTE ON FUNCTION get_max_value_gap         TO anon;
GRANT EXECUTE ON FUNCTION get_fixtures_for_date     TO anon;
GRANT EXECUTE ON FUNCTION get_next_fixture_date     TO anon;

-- ============================================================
-- ADDITIONAL RPC FUNCTIONS (added post-initial-schema)
-- ============================================================

-- League directory — list all leagues with fixture/team/prediction counts
CREATE OR REPLACE FUNCTION get_league_directory()
RETURNS JSON LANGUAGE SQL STABLE AS $$
  WITH latest_seasons AS (
    SELECT league, MAX(season) AS season
    FROM matches
    WHERE league IS NOT NULL
    GROUP BY league
  ),
  fixture_counts AS (
    SELECT m.league, m.season, COUNT(*) AS cnt
    FROM matches m
    JOIN latest_seasons ls ON m.league = ls.league AND m.season = ls.season
    GROUP BY m.league, m.season
  ),
  team_counts AS (
    SELECT ts.league, ts.season, COUNT(DISTINCT ts.team) AS cnt
    FROM team_stats ts
    JOIN latest_seasons ls ON ts.league = ls.league AND ts.season = ls.season
    GROUP BY ts.league, ts.season
  ),
  pred_counts AS (
    SELECT league, COUNT(*) AS cnt
    FROM prediction_log
    GROUP BY league
  )
  SELECT json_agg(row_to_json(q)) FROM (
    SELECT
      ls.league,
      ls.season,
      COALESCE(fc.cnt, 0) AS "fixtureCount",
      COALESCE(tc.cnt, 0) AS "teamCount",
      COALESCE(pc.cnt, 0) AS "predictionCount"
    FROM latest_seasons ls
    LEFT JOIN fixture_counts fc ON fc.league = ls.league
    LEFT JOIN team_counts tc ON tc.league = ls.league
    LEFT JOIN pred_counts pc ON pc.league = ls.league
    ORDER BY ls.league
  ) q;
$$;

-- Distinct leagues list
CREATE OR REPLACE FUNCTION get_distinct_leagues()
RETURNS JSON LANGUAGE SQL STABLE AS $$
  SELECT json_agg(league ORDER BY league)
  FROM (SELECT DISTINCT league FROM matches WHERE league IS NOT NULL) q;
$$;

-- Distinct seasons list (optional league filter)
CREATE OR REPLACE FUNCTION get_distinct_seasons(p_league TEXT DEFAULT NULL)
RETURNS JSON LANGUAGE SQL STABLE AS $$
  SELECT json_agg(season ORDER BY season DESC)
  FROM (
    SELECT DISTINCT season FROM matches
    WHERE league IS NOT NULL
    AND (p_league IS NULL OR league = p_league)
  ) q;
$$;

-- Fixed get_league_standings (position is reserved word — use pos alias)
CREATE OR REPLACE FUNCTION get_league_standings(p_league TEXT, p_season TEXT)
RETURNS JSON LANGUAGE SQL STABLE AS $$
  SELECT json_agg(row_to_json(q)) FROM (
    SELECT
      ts.team,
      ts.points,
      ts.games_played,
      ts.wins,
      ts.draws,
      ts.losses,
      ts.goals_scored,
      ts.goals_conceded,
      (ts.goals_scored - ts.goals_conceded) AS goal_diff,
      ROW_NUMBER() OVER (ORDER BY ts.points DESC, (ts.goals_scored - ts.goals_conceded) DESC, ts.goals_scored DESC) AS pos
    FROM team_stats ts
    WHERE ts.league = p_league AND ts.season = p_season
    ORDER BY ts.points DESC, (ts.goals_scored - ts.goals_conceded) DESC, ts.goals_scored DESC
  ) q;
$$;

-- Grant execute on new functions
GRANT EXECUTE ON FUNCTION get_league_directory()               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_distinct_leagues()               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_distinct_seasons(TEXT)           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_league_standings(TEXT, TEXT)     TO anon, authenticated;

-- ============================================================
-- MISSING RLS POLICIES (added post-initial-schema)
-- ============================================================

CREATE POLICY "anon_read_league_mappings"      ON league_mappings      FOR SELECT USING (true);
CREATE POLICY "anon_read_live_standings"       ON live_standings       FOR SELECT USING (true);
CREATE POLICY "anon_read_live_standings_rows"  ON live_standings_rows  FOR SELECT USING (true);
CREATE POLICY "anon_read_live_h2h_matches"     ON live_h2h_matches     FOR SELECT USING (true);
CREATE POLICY "anon_read_match_referees"       ON match_referees       FOR SELECT USING (true);
CREATE POLICY "anon_read_match_weather"        ON match_weather        FOR SELECT USING (true);
CREATE POLICY "anon_read_team_lineups"         ON team_lineups         FOR SELECT USING (true);
CREATE POLICY "anon_read_understat_team_stats" ON understat_team_stats FOR SELECT USING (true);
CREATE POLICY "anon_read_scraper_health"       ON scraper_health       FOR SELECT USING (true);
CREATE POLICY "anon_read_clubelo_fixtures"     ON clubelo_fixtures     FOR SELECT USING (true);

-- ============================================================
-- ADDITIONAL RPC FUNCTIONS (added post-initial-schema)
-- ============================================================

-- League directory — list all leagues with fixture/team/prediction counts
CREATE OR REPLACE FUNCTION get_league_directory()
RETURNS JSON LANGUAGE SQL STABLE AS $$
  WITH latest_seasons AS (
    SELECT league, MAX(season) AS season
    FROM matches
    WHERE league IS NOT NULL
    GROUP BY league
  ),
  fixture_counts AS (
    SELECT m.league, m.season, COUNT(*) AS cnt
    FROM matches m
    JOIN latest_seasons ls ON m.league = ls.league AND m.season = ls.season
    GROUP BY m.league, m.season
  ),
  team_counts AS (
    SELECT ts.league, ts.season, COUNT(DISTINCT ts.team) AS cnt
    FROM team_stats ts
    JOIN latest_seasons ls ON ts.league = ls.league AND ts.season = ls.season
    GROUP BY ts.league, ts.season
  ),
  pred_counts AS (
    SELECT league, COUNT(*) AS cnt
    FROM prediction_log
    GROUP BY league
  )
  SELECT json_agg(row_to_json(q)) FROM (
    SELECT
      ls.league,
      ls.season,
      COALESCE(fc.cnt, 0) AS "fixtureCount",
      COALESCE(tc.cnt, 0) AS "teamCount",
      COALESCE(pc.cnt, 0) AS "predictionCount"
    FROM latest_seasons ls
    LEFT JOIN fixture_counts fc ON fc.league = ls.league
    LEFT JOIN team_counts tc ON tc.league = ls.league
    LEFT JOIN pred_counts pc ON pc.league = ls.league
    ORDER BY ls.league
  ) q;
$$;

-- Distinct leagues list
CREATE OR REPLACE FUNCTION get_distinct_leagues()
RETURNS JSON LANGUAGE SQL STABLE AS $$
  SELECT json_agg(league ORDER BY league)
  FROM (SELECT DISTINCT league FROM matches WHERE league IS NOT NULL) q;
$$;

-- Distinct seasons list (optional league filter)
CREATE OR REPLACE FUNCTION get_distinct_seasons(p_league TEXT DEFAULT NULL)
RETURNS JSON LANGUAGE SQL STABLE AS $$
  SELECT json_agg(season ORDER BY season DESC)
  FROM (
    SELECT DISTINCT season FROM matches
    WHERE league IS NOT NULL
    AND (p_league IS NULL OR league = p_league)
  ) q;
$$;

-- Fixed get_league_standings (position is reserved word — use pos alias)
CREATE OR REPLACE FUNCTION get_league_standings(p_league TEXT, p_season TEXT)
RETURNS JSON LANGUAGE SQL STABLE AS $$
  SELECT json_agg(row_to_json(q)) FROM (
    SELECT
      ts.team,
      ts.points,
      ts.games_played,
      ts.wins,
      ts.draws,
      ts.losses,
      ts.goals_scored,
      ts.goals_conceded,
      (ts.goals_scored - ts.goals_conceded) AS goal_diff,
      ROW_NUMBER() OVER (ORDER BY ts.points DESC, (ts.goals_scored - ts.goals_conceded) DESC, ts.goals_scored DESC) AS pos
    FROM team_stats ts
    WHERE ts.league = p_league AND ts.season = p_season
    ORDER BY ts.points DESC, (ts.goals_scored - ts.goals_conceded) DESC, ts.goals_scored DESC
  ) q;
$$;

-- Grant execute on new functions
GRANT EXECUTE ON FUNCTION get_league_directory()               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_distinct_leagues()               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_distinct_seasons(TEXT)           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_league_standings(TEXT, TEXT)     TO anon, authenticated;

-- ============================================================
-- MISSING RLS POLICIES (added post-initial-schema)
-- ============================================================

CREATE POLICY "anon_read_league_mappings"      ON league_mappings      FOR SELECT USING (true);
CREATE POLICY "anon_read_live_standings"       ON live_standings       FOR SELECT USING (true);
CREATE POLICY "anon_read_live_standings_rows"  ON live_standings_rows  FOR SELECT USING (true);
CREATE POLICY "anon_read_live_h2h_matches"     ON live_h2h_matches     FOR SELECT USING (true);
CREATE POLICY "anon_read_match_referees"       ON match_referees       FOR SELECT USING (true);
CREATE POLICY "anon_read_match_weather"        ON match_weather        FOR SELECT USING (true);
CREATE POLICY "anon_read_team_lineups"         ON team_lineups         FOR SELECT USING (true);
CREATE POLICY "anon_read_understat_team_stats" ON understat_team_stats FOR SELECT USING (true);
CREATE POLICY "anon_read_scraper_health"       ON scraper_health       FOR SELECT USING (true);
CREATE POLICY "anon_read_clubelo_fixtures"     ON clubelo_fixtures     FOR SELECT USING (true);
