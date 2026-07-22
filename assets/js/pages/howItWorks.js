import { db } from '../db/dbProvider.js';
/**
 * renderHowItWorks — Section 4 item 10
 *
 * A static informational page explaining how the PlusOne prediction system
 * works: the four engines (DC, ML, Legacy, Consensus), how confidence tiers
 * are assigned, what value gap means, and what market predictions cover.
 * Pulls live engine weight history from the loaded DB so readers see real
 * current blend weights, not just a hand-written description.
 */
import { formatPct } from '../components/format.js';

export async function renderHowItWorks() {
  // Engine weights — shown live if available, gracefully omitted if not
  let weightsSection = '';
  if (db.ready) {
    const _ew = await db.query('engine_weights', { order: 'computed_at.desc', limit: 1 });
    const latest = (_ew && _ew.length > 0) ? _ew[0] : null;
    if (latest) {
      const dc  = formatPct(latest.dc_weight);
      const ml  = formatPct(latest.ml_weight);
      const leg = formatPct(latest.legacy_weight);
      const ss  = latest.sample_size ? latest.sample_size.toLocaleString() : '—';
      const nr  = latest.naive_rate != null ? formatPct(latest.naive_rate) : '—';
      weightsSection = `
        <div class="panel how-weights-panel">
          <h3>Current Engine Blend Weights <span class="panel__count">computed dynamically from ${ss} graded matches</span></h3>
          <div class="how-weights-grid">
            <div class="how-weight-card">
              <span class="how-weight-card__pct" style="color:var(--pitch-teal)">${dc}</span>
              <span class="how-weight-card__label">Dixon-Coles</span>
            </div>
            <div class="how-weight-card">
              <span class="how-weight-card__pct" style="color:#7C9CFF">${ml}</span>
              <span class="how-weight-card__label">ML Engine</span>
            </div>
            <div class="how-weight-card">
              <span class="how-weight-card__pct" style="color:#E07A5F">${leg}</span>
              <span class="how-weight-card__label">Legacy</span>
            </div>
          </div>
          <p class="how-weights-note">Naive baseline (always-pick-home accuracy on training sample): ${nr}. Engines are only blended in when they outperform this baseline on held-out data.</p>
        </div>`;
    }
  }

  return `
    <section class="page page--how-it-works">
      <header class="page__header">
        <h1>How Predictions Work</h1>
        <p class="page__subtitle">A plain-language guide to every number on this site — where it comes from, how it's computed, and what it doesn't mean.</p>
      </header>

      <!-- The four engines -->
      <div class="panel">
        <h3>The Four Prediction Engines</h3>
        <p>Every match gets evaluated by three independent statistical models. A fourth "consensus" value is then blended from those three outputs.</p>
        <div class="engine-grid" style="margin-top:var(--space-4)">
          <div class="how-engine-card" style="border-top:3px solid var(--pitch-teal)">
            <h4>Dixon-Coles (DC)</h4>
            <p>A Poisson-process model that estimates expected goals (xG) for each team based on their attack strength, defence strength, and home advantage — calibrated against historical results. DC gives you the <em>expected scoreline</em> and derives match-outcome probabilities from the full Poisson distribution over all possible scorelines.</p>
            <div class="how-tag">Strengths: mathematically principled, interpretable, handles rare scorelines</div>
          </div>
          <div class="how-engine-card" style="border-top:3px solid #7C9CFF">
            <h4>ML Engine</h4>
            <p>A machine-learning classifier trained on structured match features (recent form, head-to-head history, team stats). It outputs Home/Draw/Away outcome probabilities directly — no intermediate xG step — learning patterns that may not be captured by a parametric model.</p>
            <div class="how-tag">Strengths: captures non-linear patterns, can weigh many features simultaneously</div>
          </div>
          <div class="how-engine-card" style="border-top:3px solid #E07A5F">
            <h4>Legacy Engine</h4>
            <p>A rule-based heuristic system combining form-weighted win rates with historical head-to-head ratios. Simple and transparent — every prediction can be traced back to a few readable numbers.</p>
            <div class="how-tag">Strengths: robust to small samples, always produces a prediction</div>
          </div>
          <div class="how-engine-card" style="border-top:3px solid var(--signal-gold)">
            <h4>Consensus</h4>
            <p>A weighted average of DC, ML, and Legacy probabilities. The weights are computed dynamically: each engine's weight is proportional to its accuracy on a held-out validation set of already-graded matches. The engine that has been most accurate recently gets the highest weight.</p>
            <div class="how-tag">This is the primary prediction you see on every match card and in value-bet filters.</div>
          </div>
        </div>
      </div>

      ${weightsSection}

      <!-- Confidence tiers -->
      <div class="panel">
        <h3>Confidence Tiers</h3>
        <p>The confidence label (<span class="pill pill--confidence-high">High</span> / <span class="pill pill--confidence-medium">Medium</span> / <span class="pill pill--confidence-low">Low</span>) reflects <strong>agreement across the three engines</strong>, not the raw probability number.</p>
        <ul class="how-list">
          <li><strong>High</strong> — all three engines (DC, ML, Legacy) agree on the same outcome as the consensus pick. When the models disagree less, the consensus blend is more stable.</li>
          <li><strong>Medium</strong> — two of the three engines agree with the consensus pick.</li>
          <li><strong>Low</strong> — fewer than two engines agree, or the engines are very close to each other in probability (near-50/50 match). The consensus still produces a pick, but with lower conviction.</li>
        </ul>
        <p class="how-note">A High-confidence pick doesn't mean a guaranteed win — it means the models are aligned. Football is inherently uncertain. Historical accuracy is visible on the <a href="#/model-performance">Model Performance</a> page.</p>
      </div>

      <!-- Value gap -->
      <div class="panel">
        <h3>Value Gap</h3>
        <p>The value gap is a comparison between the consensus model probability and implied bookmaker probability. It's computed per outcome (Home / Draw / Away):</p>
        <div class="how-formula">
          Value Gap = Model Probability − (1 / Bookmaker Odds)
        </div>
        <p>A positive value gap suggests the model thinks the outcome is more likely than the bookmaker does. This is used by the <a href="#/value-bets">Value Bets</a> filter to surface potential discrepancies. A 0% gap means the model and the market agree exactly.</p>
        <p class="how-note">The value gap is not a bet recommendation. It is a mathematical difference between two probability estimates — one from a model, one implied from market odds. Both can be wrong.</p>
      </div>

      <!-- Market predictions -->
      <div class="panel">
        <h3>Market Predictions</h3>
        <p>Beyond the 1X2 outcome (Home/Draw/Away), each match also has Poisson-derived probability estimates for additional markets:</p>
        <ul class="how-list">
          <li><strong>Over/Under Goals</strong> (0.5 / 1.5 / 2.5 / 3.5) — cumulative Poisson probabilities over DC's expected goals for both teams. Over 2.5 is the most commonly referenced threshold.</li>
          <li><strong>Both Teams To Score (BTTS)</strong> — probability that both teams score at least one goal, derived from the independent Poisson goal distributions for each team.</li>
          <li><strong>Double Chance</strong> (1X, 12, X2) — sums of two consensus probabilities. 1X = Home + Draw, 12 = Home + Away, X2 = Draw + Away.</li>
          <li><strong>Team to Score</strong> — probability that each individual team finds the net at least once.</li>
        </ul>
        <p>These are visible on the <strong>Markets</strong> tab of each Match Detail page.</p>
      </div>

      <!-- Score predictions -->
      <div class="panel">
        <h3>Scoreline Predictions</h3>
        <p>The Dixon-Coles model's Poisson distribution generates a probability for every possible scoreline (0-0, 1-0, 0-1, 1-1, … up to a reasonable ceiling). The top 3 most likely scorelines are stored and shown on the <strong>Prediction</strong> tab as "Most Likely Scores".</p>
        <p class="how-note">The probabilities of the top-3 scorelines typically sum to well under 50% — a 1-0 might be the single most likely scoreline at just 18%. This is normal: goals are rare events spread across many possible combinations.</p>
      </div>

      <!-- Grading -->
      <div class="panel">
        <h3>How Predictions Are Graded</h3>
        <p>Once a match finishes, the actual result is written back to <code>prediction_log</code> and each prediction is graded:</p>
        <ul class="how-list">
          <li><code>consensus_correct = 1</code> if the consensus pick matched the actual outcome, else 0.</li>
          <li>The same for DC, ML, and Legacy separately.</li>
          <li><code>status</code> moves from <code>pending</code> to <code>graded</code>.</li>
        </ul>
        <p>Aggregated accuracy over time is then visible on the <a href="#/model-performance">Model Performance</a> page, which charts monthly accuracy per engine and shows the calibration curve — how closely the model's stated probabilities track the observed frequency of correct calls.</p>
      </div>

      <!-- What this is not -->
      <div class="panel" style="border-color:var(--negative)">
        <h3>What This Is Not</h3>
        <ul class="how-list">
          <li>This is <strong>not betting advice</strong>. The value gap is a mathematical observation, not an instruction to place a bet.</li>
          <li>The model does not have access to last-minute team news, private injury information, or in-play events. All predictions are based only on what was scraped at prediction time.</li>
          <li>Past accuracy does not guarantee future accuracy. Football outcomes have genuine randomness that no model can eliminate.</li>
          <li>Bookmaker odds already incorporate vig (margin). The implied probability from raw odds is always slightly too high — a model that matches the market is still below the break-even accuracy needed to profit.</li>
        </ul>
      </div>
    </section>
  `;
}
