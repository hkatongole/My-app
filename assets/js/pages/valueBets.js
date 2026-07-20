import { predictionRepository  } from '../db/repositories.js';
import { teamBadge, leagueBadge } from '../components/badges.js';
import { formatDate, todayISO, scoreline } from '../components/format.js';
import { renderMatchesList } from '../components/matchList.js';
import { storage } from '../db/storageAdapter.js';

const TIERS = ['Low', 'Medium', 'High'];

export async function renderValueBets({ query }) {
  if (!storage.ready) {
    return `<div class="empty-state"><h2>No database loaded</h2><p>Import a .sqlite backup from the Home page first.</p></div>`;
  }

  const minConfidenceTier = TIERS.includes(query.confidence) ? query.confidence : 'Medium';
  const minValueGapPct = Number(query.gap ?? 0);
  const scope = query.scope === 'upcoming' ? 'upcoming' : 'all';
  const league = query.league || null;

  const rows = await predictionRepository.valueBets({
    minConfidenceTier,
    minValueGap: minValueGapPct / 100,
    fromDate: scope === 'upcoming' ? todayISO() : undefined,
    limit: 100,
  });
  const filtered = league ? rows.filter((r) => r.league === league) : rows;
  const leagues = await predictionRepository.distinctLeagues();
  const maxGap = await predictionRepository.maxValueGap();

  return `
    <section class="page page--value-bets">
      <header class="page__header">
        <h1>Value &amp; Safe Bets</h1>
        <p class="page__subtitle">Predictions where confidence and value gap both clear the thresholds below &mdash; recomputed live from stored data on every change, never a cached or static list.</p>
      </header>

      <form class="filter-bar" id="value-bets-filter-form">
        <label>Min. confidence
          <select name="confidence">
            ${TIERS.map((t) => `<option value="${t}" ${t === minConfidenceTier ? 'selected' : ''}>${t}+</option>`).join('')}
          </select>
        </label>
        <label>Min. value gap
          <select name="gap">
            ${[0, 5, 10, 15, 20, 25].map((g) => `<option value="${g}" ${g === minValueGapPct ? 'selected' : ''}>${g}%+</option>`).join('')}
          </select>
        </label>
        <label>Scope
          <select name="scope">
            <option value="all" ${scope === 'all' ? 'selected' : ''}>All dates</option>
            <option value="upcoming" ${scope === 'upcoming' ? 'selected' : ''}>Upcoming only</option>
          </select>
        </label>
        <label>League
          <select name="league">
            <option value="">All leagues</option>
            ${leagues.map((l) => `<option value="${l}" ${l === league ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
        <button type="submit">Apply</button>
      </form>

      <p class="panel__count" style="display:block;margin-bottom:12px;">${filtered.length} prediction${filtered.length === 1 ? '' : 's'} clear these thresholds</p>

      ${filtered.length > 0 ? renderMatchesList(filtered, window.userSettings?.viewMode || 'cards') : emptyState(minValueGapPct, maxGap, scope)}
    </section>
  `;
}

/** Honest, specific empty state -- if the requested gap threshold exceeds the
 *  highest value gap actually present in the loaded data, say so explicitly
 *  rather than a generic "no results" that reads like a bug. */
function emptyState(requestedGapPct, maxGap, scope) {
  const maxGapPct = maxGap != null ? Math.round(maxGap * 100) : null;
  const gapNote =
    maxGapPct != null && requestedGapPct > maxGapPct
      ? `The highest value gap on record in this database is ${maxGapPct}% &mdash; try lowering the threshold.`
      : 'Try lowering the confidence or value gap threshold.';
  const scopeNote = scope === 'upcoming' ? ' Also try "All dates" if this database has no fixtures on or after today.' : '';
  return `
    <div class="empty-state">
      <h3>No predictions clear these thresholds</h3>
      <p>${gapNote}${scopeNote}</p>
    </div>
  `;
}
