import { storage } from '../db/storageAdapter.js';
import { teamBadge } from '../components/badges.js';
import { formatDateTime } from '../components/format.js';

/**
 * renderInjuries — Section 4 item 9
 *
 * A dedicated injuries page showing all active injury records from
 * team_injuries, filterable by league and club.
 * Only rendered when the table exists and has rows.
 */
export async function renderInjuries({ query = {} } = {}) {
  if (!storage.ready) {
    return `<div class="empty-state"><h2>No database loaded</h2><p>Import a .sqlite backup from the Home page first.</p></div>`;
  }

  if (!storage.hasTable('team_injuries')) {
    return `<div class="empty-state"><h2>No injury data</h2><p>The team_injuries table is not present in this database backup.</p></div>`;
  }

  const leagueFilter = query.league || null;
  const clubFilter   = query.club   || null;

  // Build filtered query
  const where  = [];
  const params = [];
  if (leagueFilter) { where.push('league = ?'); params.push(leagueFilter); }
  if (clubFilter)   { where.push('club = ?');   params.push(clubFilter);   }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = storage.all(
    `SELECT * FROM team_injuries ${whereSql} ORDER BY league ASC, club ASC, return_date ASC`,
    params
  );

  // For filter dropdowns
  const leagues = storage.all(`SELECT DISTINCT league FROM team_injuries WHERE league IS NOT NULL ORDER BY league`)
    .map(r => r.league);
  const clubs = storage.all(
    leagueFilter
      ? `SELECT DISTINCT club FROM team_injuries WHERE league = ? ORDER BY club`
      : `SELECT DISTINCT club FROM team_injuries ORDER BY club`,
    leagueFilter ? [leagueFilter] : []
  ).map(r => r.club);

  const total = storage.all(`SELECT COUNT(*) AS n FROM team_injuries ${whereSql}`, params)[0]?.n ?? 0;

  const opt = (val, current) =>
    `<option value="${val}" ${val === current ? 'selected' : ''}>${val}</option>`;

  // Group rows by league then club for visual hierarchy
  const grouped = {};
  for (const row of rows) {
    const lg = row.league || '—';
    if (!grouped[lg]) grouped[lg] = {};
    const cl = row.club || '—';
    if (!grouped[lg][cl]) grouped[lg][cl] = [];
    grouped[lg][cl].push(row);
  }

  const positionIcon = (pos) => {
    if (!pos) return '';
    const icons = {
      'Goalkeeper': '🧤',
      'Centre-Back': '🛡️', 'Left-Back': '🛡️', 'Right-Back': '🛡️', 'Defender': '🛡️',
      'Defensive Midfield': '⚙️', 'Central Midfield': '⚙️', 'Left Midfield': '⚙️', 'Right Midfield': '⚙️',
      'Attacking Midfield': '✨', 'Left Winger': '✨', 'Right Winger': '✨',
      'Centre-Forward': '⚽', 'Second Striker': '⚽', 'Forward': '⚽', 'Striker': '⚽',
    };
    return icons[pos] ? `<span title="${pos}">${icons[pos]}</span>` : '';
  };

  const injuryBadge = (injury) => {
    if (!injury || injury.toLowerCase() === 'unknown') {
      return `<span class="pill injury-pill--unknown">Unknown</span>`;
    }
    return `<span class="pill injury-pill--known">${injury}</span>`;
  };

  const returnDate = (d) => {
    if (!d || d === '') return `<span class="injury-return--none">No date set</span>`;
    return `<span class="injury-return">${d}</span>`;
  };

  let bodyHtml = '';
  if (rows.length === 0) {
    bodyHtml = `<div class="empty-state"><p>No injury records match these filters.</p></div>`;
  } else {
    for (const [league, clubs_obj] of Object.entries(grouped)) {
      bodyHtml += `<div class="injury-league-block">
        <h2 class="injury-league-title">${league}</h2>`;

      for (const [club, injuries] of Object.entries(clubs_obj)) {
        bodyHtml += `
          <div class="injury-club-block">
            <div class="injury-club-header">
              ${teamBadge(club, { size: 'sm' })}
              <h3 class="injury-club-name">${club}</h3>
              <span class="pill">${injuries.length} player${injuries.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="table-scroll">
              <table class="data-table data-table--compact">
                <thead><tr>
                  <th>Player</th>
                  <th>Position</th>
                  <th>Injury</th>
                  <th>Return Date</th>
                  <th>Market Value</th>
                  <th>As of</th>
                </tr></thead>
                <tbody>
                  ${injuries.map(i => `
                    <tr>
                      <td><strong>${i.player}</strong></td>
                      <td>${positionIcon(i.position)} ${i.position ?? '—'}</td>
                      <td>${injuryBadge(i.injury)}</td>
                      <td>${returnDate(i.return_date)}</td>
                      <td class="injury-market-value">${i.market_value ?? '—'}</td>
                      <td class="injury-scraped">${i.scraped_date ? i.scraped_date.slice(0, 10) : '—'}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>`;
      }
      bodyHtml += `</div>`;
    }
  }

  return `
    <section class="page page--injuries">
      <header class="page__header">
        <h1>Injury Reports</h1>
        <p class="page__subtitle">All active injury records from the database &mdash; ${total.toLocaleString()} player${total !== 1 ? 's' : ''} affected.</p>
      </header>

      <form class="filter-bar" id="injuries-filter-form">
        <label>League
          <select name="league">
            <option value="">All leagues</option>
            ${leagues.map(l => opt(l, leagueFilter)).join('')}
          </select>
        </label>
        <label>Club
          <select name="club">
            <option value="">All clubs</option>
            ${clubs.map(c => opt(c, clubFilter)).join('')}
          </select>
        </label>
        <button type="submit">Apply</button>
      </form>

      ${bodyHtml}
    </section>
  `;
}
