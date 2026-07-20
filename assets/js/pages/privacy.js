/**
 * renderPrivacy — Section 4 item 12
 * Privacy Policy for PlusOne Analytics
 */
export async function renderPrivacy() {
  return `
    <section class="page page--legal">
      <header class="page__header">
        <h1>Privacy Policy</h1>
        <p class="page__subtitle">Last updated: July 2026</p>
      </header>

      <div class="panel legal-panel">
        <h3>1. How This App Works</h3>
        <p>PlusOne Analytics is a <strong>client-side Progressive Web App (PWA)</strong>. Your sports database file is processed entirely inside your browser using WebAssembly (sql.js). <strong>No data from your database is ever sent to our servers.</strong></p>
        <p>When you import a <code>.sqlite</code> file, it is read directly in your browser's memory and optionally saved to your browser's <strong>Origin Private File System (OPFS)</strong> — a local storage area that only this app can access, scoped entirely to your device.</p>
      </div>

      <div class="panel legal-panel">
        <h3>2. Data We Do Not Collect</h3>
        <p>We do not collect, transmit, or store:</p>
        <ul class="legal-list">
          <li>Your database files or any data inside them</li>
          <li>Match predictions you view or filter results you generate</li>
          <li>Personally identifiable information of any kind</li>
          <li>Device identifiers, IP addresses, or location data</li>
          <li>Browsing history or navigation patterns within the app</li>
        </ul>
      </div>

      <div class="panel legal-panel">
        <h3>3. Local Storage</h3>
        <p>The app uses two browser storage mechanisms, both of which are <strong>local to your device only</strong>:</p>
        <ul class="legal-list">
          <li><strong>Origin Private File System (OPFS)</strong> — stores your SQLite database between sessions so you don't have to re-import it every time. This data never leaves your device. You can clear it by clearing your browser's site data for this origin.</li>
          <li><strong>No cookies</strong> — this app does not set any cookies, first-party or third-party.</li>
        </ul>
      </div>

      <div class="panel legal-panel">
        <h3>4. Third-Party Services</h3>
        <p>In its local (SQLite) mode, this app makes no external network requests after loading the initial page assets. All computation is local.</p>
        <p>If the cloud database mode is enabled (Supabase), match data is fetched from a Supabase-hosted PostgreSQL database. In that mode, standard Supabase network request logs may apply. No personal data is sent — only query parameters for the sports data you are viewing.</p>
        <p>No advertising networks, analytics SDKs, social tracking pixels, or other third-party data collection tools are included in this app.</p>
      </div>

      <div class="panel legal-panel">
        <h3>5. Your Rights</h3>
        <p>Since we do not collect personal data, there is no data for us to delete, export, or correct on your behalf. Any data stored locally (your imported SQLite file in OPFS) is entirely under your control and can be removed at any time by clearing your browser's site data.</p>
      </div>

      <div class="panel legal-panel">
        <h3>6. Children's Privacy</h3>
        <p>This Service is not directed at children under 13. We do not knowingly collect data from children. If you believe a child has provided information through this Service, please contact us so we can investigate.</p>
      </div>

      <div class="panel legal-panel">
        <h3>7. Changes to This Policy</h3>
        <p>If we materially change how we handle data, we will update this page and revise the "Last updated" date at the top. We encourage you to review this policy periodically.</p>
      </div>

      <div class="panel legal-panel">
        <h3>8. Contact</h3>
        <p>Questions about this Privacy Policy can be directed to the PlusOne Analytics project maintainer. Contact details are available in the project's source repository.</p>
      </div>
    </section>
  `;
}
