import { teamBadge, leagueBadge } from './badges.js';
import { formatPct, formatDateTime, scoreline } from './format.js';

function escapeText(s) {
  return (s ?? '').toString().replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

/**
 * Renders an array of match rows as either a card grid or a data table.
 * @param {Array} matches - The matches from the database.
 * @param {string} viewMode - 'cards' or 'table'.
 */
export function renderMatchesList(matches, viewMode = 'cards') {
  if (!matches || matches.length === 0) return '';

  if (viewMode === 'table') {
    const rows = matches.map((row) => {
      const matchId = row.id ?? row.match_id;
      const consensus = row.pred_consensus_outcome ?? row.consensus_outcome;
      const conf = row.pred_confidence ?? row.confidence;
      const homeScore = row.home_score ?? row.actual_home_score;
      const awayScore = row.away_score ?? row.actual_away_score;
      const valueGaps = [
        row.pred_value_gap_home ?? row.value_gap_home,
        row.pred_value_gap_draw ?? row.value_gap_draw,
        row.pred_value_gap_away ?? row.value_gap_away
      ].filter((v) => v != null);
      
      const hasConsensus = consensus !== undefined && consensus !== null;
      const confidenceStr = conf || '\u2014';
      const maxValueGap = valueGaps.length ? formatPct(Math.max(...valueGaps)) : '\u2014';
      
      return `
        <tr class="clickable-row" data-href="#/matches/${matchId}">
          <td>
            <div style="font-weight:600">${formatDateTime(row.start_time || row.match_date)}</div>
            <div style="color:var(--paper-400);font-size:11px;margin-top:2px;">
              ${leagueBadge(row.league)} ${escapeText(row.league)} ${row.gameweek ? `(GW ${row.gameweek})` : ''}
            </div>
          </td>
          <td>
            <div class="cell-teams">
              <span>${teamBadge(row.home_team)} ${escapeText(row.home_team)}</span>
              <span>${teamBadge(row.away_team)} ${escapeText(row.away_team)}</span>
            </div>
          </td>
          <td style="font-weight:700;font-size:14px;color:var(--signal-gold);text-align:center;">
            ${scoreline(homeScore, awayScore)}
          </td>
          <td>
            ${hasConsensus ? `<span class="pill pill--pick">${escapeText(consensus)}</span>` : '<span style="color:var(--paper-400)">\u2014</span>'}
          </td>
          <td>${escapeText(confidenceStr)}</td>
          <td>${maxValueGap}</td>
          <td><a href="#/matches/${matchId}">View</a></td>
        </tr>
      `;
    }).join('');

    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date & League</th>
              <th>Teams</th>
              <th style="text-align:center;">Score</th>
              <th>Prediction</th>
              <th>Confidence</th>
              <th>Max Value</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  // Fallback to Cards
  const cards = matches.map((row) => {
    const matchId = row.id ?? row.match_id;
    const consensus = row.pred_consensus_outcome ?? row.consensus_outcome;
    const conf = row.pred_confidence ?? row.confidence;
    const homeScore = row.home_score ?? row.actual_home_score;
    const awayScore = row.away_score ?? row.actual_away_score;
    const valueGaps = [
      row.pred_value_gap_home ?? row.value_gap_home,
      row.pred_value_gap_draw ?? row.value_gap_draw,
      row.pred_value_gap_away ?? row.value_gap_away
    ].filter((v) => v != null);
    
    const hasConsensus = consensus !== undefined && consensus !== null;
    const maxValueGap = valueGaps.length ? Math.max(...valueGaps) : null;

    return `
      <article class="match-card">
        <div class="match-card__league">${leagueBadge(row.league)} <span>${escapeText(row.league)}</span></div>
        <div class="match-card__teams">
          <div class="match-card__team">${teamBadge(row.home_team)} <span>${escapeText(row.home_team)}</span></div>
          <div class="match-card__score">${scoreline(homeScore, awayScore)}</div>
          <div class="match-card__team">${teamBadge(row.away_team)} <span>${escapeText(row.away_team)}</span></div>
        </div>
        <div class="match-card__meta">
          <span>${formatDateTime(row.start_time || row.match_date)}</span>
          ${row.gameweek ? `<span>GW ${row.gameweek}</span>` : ''}
        </div>
        ${
          hasConsensus
            ? `<div class="match-card__prediction">
                <span class="pill pill--pick">${escapeText(consensus)}</span>
                ${conf ? `<span class="pill pill--confidence-${String(conf).toLowerCase()}">${escapeText(conf)} confidence</span>` : ''}
                ${maxValueGap !== null ? `<span class="pill pill--value">Value gap ${formatPct(maxValueGap)}</span>` : ''}
              </div>`
            : `<div class="match-card__prediction match-card__prediction--none">No prediction on record yet</div>`
        }
        <a class="match-card__link" href="#/matches/${matchId}">Full breakdown &rarr;</a>
      </article>
    `;
  }).join('');

  return `<div class="card-grid">${cards}</div>`;
}
