/**
 * renderTerms — Section 4 item 11
 * Terms of Service for PlusOne Analytics
 */
export async function renderTerms() {
  return `
    <section class="page page--legal">
      <header class="page__header">
        <h1>Terms of Service</h1>
        <p class="page__subtitle">Last updated: July 2026</p>
      </header>

      <div class="panel legal-panel">
        <h3>1. About This Service</h3>
        <p>PlusOne Analytics ("the Service", "we", "us") is an informational sports analytics platform. It presents statistical analysis and machine-learning model outputs derived from publicly available football match data. The Service is provided free of charge for personal, non-commercial use.</p>
      </div>

      <div class="panel legal-panel">
        <h3>2. Not Betting Advice</h3>
        <p><strong>The Service does not provide betting advice, tips, or recommendations.</strong> All predictions, value-gap figures, confidence scores, and market probability estimates are outputs of statistical models. They are presented for informational and educational purposes only.</p>
        <p>We explicitly disclaim any responsibility for financial decisions made based on content from this Service. You must not use this Service as a basis for placing bets or wagers of any kind.</p>
      </div>

      <div class="panel legal-panel">
        <h3>3. No Warranties</h3>
        <p>The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that:</p>
        <ul class="legal-list">
          <li>Predictions will be accurate or reflect actual match outcomes</li>
          <li>The data is free from errors, omissions, or delays</li>
          <li>The Service will be uninterrupted or available at any particular time</li>
        </ul>
        <p>Football match outcomes involve genuine uncertainty and randomness. No statistical model can predict them reliably, and past model accuracy does not guarantee future accuracy.</p>
      </div>

      <div class="panel legal-panel">
        <h3>4. Accuracy of Data</h3>
        <p>Match data, odds, and statistics shown on this Service are sourced from automated scrapers and may be incomplete, delayed, or contain errors. Fields marked with "—" indicate data that was not available at the time of the database export. You should verify any time-sensitive information against primary sources before relying on it.</p>
      </div>

      <div class="panel legal-panel">
        <h3>5. Permitted Use</h3>
        <p>You may use this Service for:</p>
        <ul class="legal-list">
          <li>Personal research and entertainment</li>
          <li>Educational analysis of football statistics and prediction models</li>
        </ul>
        <p>You may not use this Service to:</p>
        <ul class="legal-list">
          <li>Re-sell or redistribute our data or predictions commercially</li>
          <li>Build derivative services that present our predictions as proprietary data</li>
          <li>Scrape or systematically harvest data at scale</li>
        </ul>
      </div>

      <div class="panel legal-panel">
        <h3>6. Limitation of Liability</h3>
        <p>To the maximum extent permitted by applicable law, PlusOne Analytics shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from your use of or inability to use the Service, including but not limited to financial losses from gambling or betting decisions influenced by content on this Service.</p>
      </div>

      <div class="panel legal-panel">
        <h3>7. Changes to These Terms</h3>
        <p>We may update these Terms of Service from time to time. Continued use of the Service after any changes constitutes acceptance of the new terms. The date at the top of this page reflects when the terms were last revised.</p>
      </div>

      <div class="panel legal-panel">
        <h3>8. Governing Law</h3>
        <p>These Terms are governed by and construed in accordance with applicable laws. If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force.</p>
      </div>
    </section>
  `;
}
