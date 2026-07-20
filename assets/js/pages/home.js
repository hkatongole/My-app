import { matchRepository  } from '../db/repositories.js';
import { formatDateTime, dataAsOfLabel, todayISO } from '../components/format.js';
import { db, USE_SUPABASE } from '../db/dbProvider.js';
import { renderMatchesList } from '../components/matchList.js';
import { userSettings } from '../components/userSettings.js';

export async function renderHome() {
  if (!db.ready) {
    return emptyDbState();
  }

  let dateStr = todayISO();
  let fixtures = await matchRepository.upcomingFixtures(dateStr, { limit: 20 });

  const asOf = await matchRepository.dataAsOf();

  const viewMode = userSettings.get('viewMode') || 'cards';
  const matchHtml = renderMatchesList(fixtures, viewMode) || `
    <div class="empty-state">
      <h3>No upcoming fixtures found</h3>
      <p>This database has no upcoming or scheduled matches recorded.</p>
    </div>
  `;

  return `
    <section class="page page--home">
      <header class="page__header">
        <h1>Upcoming Predictions</h1>
        <p class="page__subtitle">
          Next 20 scheduled matches starting from <strong>${formatDateTime(dateStr)}</strong>
        </p>
        <p class="data-as-of">${dataAsOfLabel(asOf)}</p>
        <p style="margin-top:8px;"><a href="#/value-bets">View Value &amp; Safe Bets &rarr;</a></p>
      </header>
      ${matchHtml}
    </section>
  `;
}



function emptyDbState() {
  if (USE_SUPABASE) return `<section class="page page--empty"><div class="empty-state"><h1>Connecting...</h1><p>Ensure your Supabase URL and key are correct.</p></div></section>`;

  return `
    <section class="page page--empty">
      <div class="empty-state empty-state--onboarding">
        <h1>Load your sports database</h1>
        <p>Import a PlusOne <code>.sqlite</code> backup to see today's fixtures, predictions, and value bets.</p>
        <label class="file-drop">
          <input type="file" id="db-file-input" accept=".sqlite,.db" />
          <span>Choose a .sqlite file, or drag one here</span>
        </label>
      </div>
    </section>
  `;
}

function escapeText(s) {
  return (s ?? '').toString().replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}
