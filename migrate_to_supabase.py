#!/usr/bin/env python3
"""
migrate_to_supabase.py
======================
One-time script to upload your local SQLite backup to Supabase.

Usage (run from your PC, not Termux):
    python migrate_to_supabase.py --db path/to/plusone_backup.sqlite \\
                                  --url https://YOUR_PROJECT.supabase.co \\
                                  --key YOUR_SERVICE_ROLE_KEY

Get your URL and service_role key from:
    Supabase Dashboard -> Project Settings -> API
    (Use the service_role key here, NOT the anon key - this script WRITES data)

The script:
  - Reads every table from SQLite
  - Upserts rows to Supabase in batches of 500
  - Verifies row counts after upload
  - Is safe to re-run (upserts won't duplicate rows)
"""

import sqlite3
import json
import urllib.request
import urllib.error
import argparse
import sys
import time

# Tables to migrate, in dependency order (referenced tables first)
TABLES_ORDER = [
    'matches',
    'prediction_log',
    'market_predictions',
    'players',
    'team_stats',
    'team_injuries',
    'match_odds',
    'fortebet_odds',
    'team_logos',
    'league_logos',
    'discovered_leagues',
    'league_params',
    'engine_weights',
    'key_value',
    'team_name_aliases',
    'historical_results',
    'match_weather',
    'match_referees',
    'referees',
    'team_lineups',
    'understat_team_stats',
    'scraper_health',
    'live_standings',
    'live_standings_rows',
    'live_match_metadata',
    'live_h2h_matches',
    'live_venues',
    'league_mappings',
    'clubelo_fixtures',
    'fortebet_match_bridge',
]

BATCH_SIZE = 500


def sqlite_table_to_dicts(conn, table_name):
    """Read all rows from a SQLite table as list of dicts."""
    cur = conn.cursor()
    try:
        cur.execute(f"SELECT COUNT(*) FROM '{table_name}'")
        count = cur.fetchone()[0]
        if count == 0:
            return []
        cur.execute(f"SELECT * FROM '{table_name}'")
        cols = [d[0] for d in cur.description]
        rows = []
        for row in cur.fetchall():
            d = {}
            for col, val in zip(cols, row):
                # Supabase/Postgres handles None as null
                d[col] = val
            rows.append(d)
        return rows
    except Exception as e:
        print(f"  WARNING: Could not read table '{table_name}': {e}")
        return []


def supabase_upsert(url, key, table, rows, batch_size=BATCH_SIZE):
    """Upsert rows to a Supabase table via REST API."""
    if not rows:
        return 0, 0

    endpoint = f"{url}/rest/v1/{table}"
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',  # upsert mode
    }

    total_uploaded = 0
    errors = 0

    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        payload = json.dumps(batch, default=str).encode('utf-8')

        req = urllib.request.Request(
            endpoint,
            data=payload,
            headers=headers,
            method='POST'
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                # 200 or 201 means success; Prefer: return=minimal means no body
                total_uploaded += len(batch)
                print(f"    Batch {i // batch_size + 1}: {len(batch)} rows OK", end='\r')
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='replace')[:300]
            print(f"\n    ERROR batch {i // batch_size + 1}: HTTP {e.code} — {body}")
            errors += 1
            # Continue with next batch rather than aborting everything
            time.sleep(1)
        except Exception as e:
            print(f"\n    ERROR batch {i // batch_size + 1}: {e}")
            errors += 1
            time.sleep(1)

    print()  # newline after \r overwriting
    return total_uploaded, errors


def supabase_count(url, key, table):
    """Get row count from Supabase table."""
    endpoint = f"{url}/rest/v1/{table}?select=id"
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Prefer': 'count=exact',
        'Range': '0-0',  # only need the count, not actual rows
    }
    req = urllib.request.Request(endpoint, headers=headers, method='GET')
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            # Count is in Content-Range header: "0-0/COUNT"
            cr = resp.headers.get('Content-Range', '')
            if '/' in cr:
                return int(cr.split('/')[1])
            return -1
    except Exception:
        return -1


def get_sqlite_tables(conn):
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    return {r[0] for r in cur.fetchall()}


def main():
    parser = argparse.ArgumentParser(description='Migrate PlusOne SQLite to Supabase')
    parser.add_argument('--db',  required=True, help='Path to plusone_backup.sqlite')
    parser.add_argument('--url', required=True, help='Supabase project URL (https://xxx.supabase.co)')
    parser.add_argument('--key', required=True, help='Supabase service_role key (NOT anon key!)')
    parser.add_argument('--tables', nargs='*', help='Only migrate these tables (default: all)')
    args = parser.parse_args()

    print('='*60)
    print('PlusOne Analytics — SQLite → Supabase Migration')
    print('='*60)
    print(f'Source:  {args.db}')
    print(f'Target:  {args.url}')
    print()

    conn = sqlite3.connect(args.db)
    sqlite_tables = get_sqlite_tables(conn)

    tables_to_migrate = args.tables if args.tables else TABLES_ORDER
    tables_to_migrate = [t for t in tables_to_migrate if t in sqlite_tables]

    results = []
    total_start = time.time()

    for table in tables_to_migrate:
        print(f'[{table}]')
        rows = sqlite_table_to_dicts(conn, table)
        sqlite_count = len(rows)
        print(f'  SQLite rows: {sqlite_count}')

        if sqlite_count == 0:
            print(f'  Skipping (empty table)')
            results.append((table, 0, 0, 0, 0))
            continue

        start = time.time()
        uploaded, errors = supabase_upsert(args.url, args.key, table, rows)
        elapsed = time.time() - start

        # Verify count in Supabase
        sb_count = supabase_count(args.url, args.key, table)
        print(f'  Uploaded: {uploaded} rows in {elapsed:.1f}s | Supabase count: {sb_count} | Errors: {errors}')
        results.append((table, sqlite_count, uploaded, sb_count, errors))
        print()

    conn.close()

    total_elapsed = time.time() - total_start
    print('='*60)
    print(f'MIGRATION COMPLETE in {total_elapsed:.1f}s')
    print()
    print(f'{"Table":<30} {"SQLite":>8} {"Uploaded":>10} {"Supabase":>10} {"Errors":>8}')
    print('-'*70)
    for table, sc, up, sbc, err in results:
        match_sym = '✓' if sc == sbc or sc == 0 else '✗'
        print(f'{match_sym} {table:<28} {sc:>8} {up:>10} {sbc:>10} {err:>8}')

    failed = [t for t, sc, up, sbc, err in results if sc > 0 and err > 0]
    if failed:
        print(f'\nWARNING: {len(failed)} tables had errors: {failed}')
        print('Re-run the script — upserts are idempotent so this is safe.')
        sys.exit(1)
    else:
        print('\nAll tables migrated successfully!')


if __name__ == '__main__':
    main()
