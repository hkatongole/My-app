import sqlite3
db = r'C:\Users\hkatongole\Downloads\New folder\plusone_backup.sqlite'
conn = sqlite3.connect(db)
print('scraper_health schema:')
row = conn.execute("SELECT sql FROM sqlite_master WHERE name='scraper_health'").fetchone()
print(row[0] if row else 'NOT FOUND')
print()
print('scraper_health sample:')
cols = [d[0] for d in conn.execute('PRAGMA table_info(scraper_health)').fetchall()]
print('Cols:', cols)
rows = conn.execute('SELECT * FROM scraper_health LIMIT 5').fetchall()
for r in rows:
    print(r)

print()
print('key_value contents:')
rows2 = conn.execute("SELECT * FROM key_value LIMIT 10").fetchall()
for r in rows2:
    print(r)

print()
print('All table row counts:')
tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()]
for t in tables:
    if t.startswith('sqlite_'):
        continue
    n = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
    print(f'  {t}: {n}')
