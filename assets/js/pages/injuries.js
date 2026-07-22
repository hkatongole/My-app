import { db } from '../db/dbProvider.js';
import { teamBadge } from '../components/badges.js';
import { formatDateTime } from '../components/format.js';

export async function renderInjuries({ query = {} } = {}) {
  if (!db.ready) {
    return `<div class="empty-state"><h2>No database loaded</h2><p>Import a .sqlite backup from the Home page first.</p></div>`;
  }

  const leagueFilter = query.league || null;
  const clubFilter   = query.club   || null;

  const conditions = [];
  if (leagueFilter) conditions.push({ col: 'league', op: 'eq', val: leagueFilter });
  if (clubFilter)   conditions.push({ col: 'club',   op: 'eq', val: clubFilter });

  const [rows, allLeagues, allClubs] = await Promise.all([
    db.query('team_injuries', {
      select: ['*'],
      conditions,
      order: 'league.asc,club.asc,return_date.asc',
      limit: 2000,
    }),
    db.query('team_injuries', {
      select: ['league'],
      conditions: [{ col: 'league', op: 'not.is', val: 'null' }],
      order: 'league.asc',
      limit: 1000,
    }),
    db.query('team_injuries', {
      select: ['club'],
      conditions: leagueFilter ? [{ col: 'league', op: 'eq', val: leagueFilter }] : [],
      order: 'club.asc',
      limit: 1000,
    }),
  ]);

  const leagues = [...new Set((allLeagues || []).map(r => r.league).filter(Boolean))];
  const clubs   = [...new Set((allClubs   || []).map(r => r.club).filter(Boolean))];
  const total   = (rows || []).length;

  const opt = (val, current) =>
    `<option value="${val}" ${val === current ? 'selected' : ''}>${val}</option>`;

  const grouped = {};
  for (const row of (rows || [])) {
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
    if (!injury || injury.toLowerCase() === 'unknown')
      return `<span class="pill injury-pill--unknown">Unknown</span>`;
    return `<span class="pill injury-pill--known">${injury}</span>`;
  };

  const returnDate = (d) => {
    if (!d || d === '') return `<span class="injury-return--none">No date set</span>`;
    return `<span class="injury-return">${d}</span>`;
  };

  let bodyHtml = '';
  if (!rows || rows.length === 0) {
    bodyHtml = `<div class="empty-state"><p>No injury records match these filters.</p></div>`;
  } else {
    for (const [league, clubs_obj] of Object.entries(grouped)) {
      bodyHtml += `<div class="injury-league-block"><h2 class="injury-league-title">${league}</h2>`;
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
                  <th>Player</th><th>Position</th><th>Injury</th>
                  <th>Return Date</th><th>Market Value</th><th>As of</th>
                </tr></thead>
                <tbody>
                  ${injuries.map(i => `
                    <tr>
                      <td><strong>${i.player}</strong></td>
                      <td>${positionIcon(i.position)} ${i.position ?? '—'}</td>
                      <td>${injuryBadge(i.injury)}</td>
                      <td>${returnDate(i.return_date)}</td>
                      <td class="injury-market-value">${i.market_value ?? '—'}</td>
                      <td class="injury-scraped">${i.scraped_date ? i.scraped_date.slice(0,10) : '—'}</td>
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
        <p class="page__subtitle">All active injury records &mdash; ${total.toLocaleString()} player${total !== 1 ? 's' : ''} affected.</p>
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
