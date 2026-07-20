import { matchRepository  } from '../db/repositories.js';
import { teamBadge, leagueBadge } from '../components/badges.js';
import { formatDate, scoreline } from '../components/format.js';
import { storage } from '../db/storageAdapter.js';
import { renderMatchesList } from '../components/matchList.js';
import { userSettings } from '../components/userSettings.js';

export async function renderMatchList({ query }) {
  if (!storage.ready) {
    return `<div class="empty-state"><h2>No database loaded</h2><p>Import a .sqlite backup from the Home page first.</p></div>`;
  }

  const page = Number(query.page || 1);
  const league = query.league || null;
  const season = query.season || null;

  const { rows, total, totalPages } = await matchRepository.filterMatches({ league, season, page, pageSize: 25 });
  const leagues = await matchRepository.listLeagues();
  const seasons = await matchRepository.listSeasons(league);

  return `
    <section class="page page--matches">
      <header class="page__header">
        <h1>Match Explorer</h1>
        <p class="page__subtitle">${total.toLocaleString()} matches on record</p>
      </header>

      <form class="filter-bar" id="match-filter-form">
        <label>League
          <select name="league">
            <option value="">All leagues</option>
            ${leagues.map((l) => `<option value="${l}" ${l === league ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
        <label>Season
          <select name="season">
            <option value="">All seasons</option>
            ${seasons.map((s) => `<option value="${s}" ${s === season ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </label>
        <button type="submit">Apply</button>
      </form>

      ${renderMatchesList(rows, userSettings.get('viewMode') || 'cards') || `<div class="empty-state"><p>No matches match these filters.</p></div>`}

      <nav class="pagination">
        ${page > 1 ? `<a href="#/matches?page=${page - 1}${league ? '&league=' + league : ''}${season ? '&season=' + season : ''}">&larr; Prev</a>` : ''}
        <span>Page ${page} of ${totalPages}</span>
        ${page < totalPages ? `<a href="#/matches?page=${page + 1}${league ? '&league=' + league : ''}${season ? '&season=' + season : ''}">Next &rarr;</a>` : ''}
      </nav>
    </section>
  `;
}

