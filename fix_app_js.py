import os
import re

APP_JS = r"C:\Users\hkatongole\Downloads\plusone-web\plusone-web\assets\js\app.js"
HOME_JS = r"C:\Users\hkatongole\Downloads\plusone-web\plusone-web\assets\js\pages\home.js"

with open(APP_JS, 'r', encoding='utf-8') as f:
    app_content = f.read()

app_content = app_content.replace(
    "import { storage } from './db/storageAdapter.js';",
    "import { db, USE_SUPABASE } from './db/dbProvider.js';\nimport { storage } from './db/storageAdapter.js';"
)

app_content = app_content.replace(
    "function handleExport(btn) {",
    "async function handleExport(btn) {"
)

boot_old = """    logStep('Initializing sql.js (WASM runtime)...');
    try {
      await withTimeout(storage.init(), 10000, 'sql.js init');
      logStep('sql.js ready.');
    } catch (err) {
      logStep(`sql.js init failed or timed out: ${err.message}`);
    }

    logStep('Checking for a previously saved database (OPFS)...');
    let restored = false;
    try {
      restored = await withTimeout(storage.restoreFromOPFS(), 6000, 'OPFS restore');
      logStep(restored ? 'Restored a saved database from OPFS.' : 'No saved database found (first run).');
    } catch (err) {
      logStep(`OPFS restore skipped: ${err.message}`);
    }"""

boot_new = """    logStep(USE_SUPABASE ? 'Initializing Supabase connection...' : 'Initializing sql.js (WASM runtime)...');
    try {
      if (USE_SUPABASE) {
        await withTimeout(db.init(), 10000, 'Supabase init');
        logStep('Supabase ready.');
      } else {
        await withTimeout(db.init(), 10000, 'sql.js init');
        logStep('sql.js ready.');
        
        logStep('Checking for a previously saved database (OPFS)...');
        let restored = false;
        try {
          restored = await withTimeout(db.restoreFromOPFS(), 6000, 'OPFS restore');
          logStep(restored ? 'Restored a saved database from OPFS.' : 'No saved database found (first run).');
        } catch (err) {
          logStep(`OPFS restore skipped: ${err.message}`);
        }
      }
    } catch (err) {
      logStep(`DB init failed or timed out: ${err.message}`);
    }"""

app_content = app_content.replace(boot_old, boot_new)

badge_old = """function updateFreshnessBadge() {
  const el = document.getElementById('db-status');
  if (!el) return;
  if (storage.ready) {
    const summary = storage.getSummary();
    el.textContent = `${summary.tables.length} tables loaded`;
    el.classList.add('db-status--ready');
  } else {
    el.textContent = 'No database loaded';
    el.classList.remove('db-status--ready');
  }
}"""

badge_new = """function updateFreshnessBadge() {
  const el = document.getElementById('db-status');
  if (!el) return;
  if (db.ready) {
    const summary = db.getSummary();
    const source = summary.source === 'supabase' ? 'Cloud' : 'Local';
    el.textContent = `${source}: ${summary.tables?.length || summary.tables} tables loaded`;
    el.classList.add('db-status--ready');
  } else {
    el.textContent = 'No database loaded';
    el.classList.remove('db-status--ready');
  }
}"""
app_content = app_content.replace(badge_old, badge_new)

import_old = """async function handleImport(file) {
  try {
    setSplashVisible(true);
    logStep(`Importing ${file.name}...`);
    await storage.importFile(file);"""

import_new = """async function handleImport(file) {
  if (USE_SUPABASE) {
    alert("Database imports are disabled in cloud mode. Use the Termux script to update the cloud database.");
    return;
  }
  try {
    setSplashVisible(true);
    logStep(`Importing ${file.name}...`);
    await db.importFile(file);"""
    
app_content = app_content.replace(import_old, import_new)

with open(APP_JS, 'w', encoding='utf-8') as f:
    f.write(app_content)
    
# Fix home.js
with open(HOME_JS, 'r', encoding='utf-8') as f:
    home_content = f.read()

home_content = home_content.replace(
    "import { storage } from '../db/storageAdapter.js';",
    "import { db, USE_SUPABASE } from '../db/dbProvider.js';"
)
home_content = home_content.replace(
    "if (!storage.ready) {",
    "if (!db.ready) {"
)
home_content = home_content.replace(
    "function emptyDbState() {",
    "function emptyDbState() {\n  if (USE_SUPABASE) return `<section class=\"page page--empty\"><div class=\"empty-state\"><h1>Connecting...</h1><p>Ensure your Supabase URL and key are correct.</p></div></section>`;\n"
)

with open(HOME_JS, 'w', encoding='utf-8') as f:
    f.write(home_content)

print("Fixed app.js and home.js")
