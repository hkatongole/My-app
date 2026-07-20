import os
import re

PAGE_DIR = r"C:\Users\hkatongole\Downloads\plusone-web\plusone-web\assets\js\pages"

def refactor_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace imports
    # import { matchRepository } from '../db/repositories/matchRepository.js';
    # -> import { matchRepository } from '../db/repositories.js';
    content = re.sub(
        r"import\s+\{\s*([a-zA-Z0-9_,\s]+)\s*\}\s+from\s+['\"]../db/repositories/[a-zA-Z0-9_]+\.js['\"];",
        r"import { \1 } from '../db/repositories.js';",
        content
    )
    
    # 2. Add await to repository calls
    repos = ['matchRepository', 'leagueRepository', 'teamRepository', 'playerRepository', 'predictionRepository', 'oddsRepository', 'logoRepository']
    
    for repo in repos:
        # We look for repo.methodName(...) and prefix with await if it's not already
        # We need to be careful not to prefix if there's already an await, but since they were sync, there shouldn't be.
        # Pattern: `repo.method(` but we might have `const x = repo.method(` or `return repo.method(`
        # Let's just do `await repo.method` safely
        content = re.sub(rf"(?<!await\s)({repo}\.[a-zA-Z0-9_]+)", rf"await \1", content)
        
    # Wait, some calls might not be awaited immediately? Like in Promise.all? 
    # Actually, if we just do `await repo.xxx(...)` everywhere, it is fine except inside Promise.all([repo.xxx()]) where we WANT the promise.
    # Let's check if there are any Promise.all in the frontend pages.
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for filename in os.listdir(PAGE_DIR):
    if filename.endswith(".js"):
        refactor_file(os.path.join(PAGE_DIR, filename))
        print(f"Refactored {filename}")

# Also update app.js for exports like predictionRepository
APP_JS = r"C:\Users\hkatongole\Downloads\plusone-web\plusone-web\assets\js\app.js"
with open(APP_JS, 'r', encoding='utf-8') as f:
    app_content = f.read()

app_content = re.sub(
    r"import\s+\{\s*([a-zA-Z0-9_,\s]+)\s*\}\s+from\s+['\"]./db/repositories/[a-zA-Z0-9_]+\.js['\"];",
    r"import { \1 } from './db/repositories.js';",
    app_content
)

app_content = app_content.replace(
    "const rows = predictionRepository.exportRows",
    "const rows = await predictionRepository.exportRows"
)

app_content = app_content.replace(
    "const rows = oddsRepository.exportMatchOdds",
    "const rows = await oddsRepository.exportMatchOdds"
)

app_content = app_content.replace(
    "const rows = oddsRepository.exportFortebetOdds",
    "const rows = await oddsRepository.exportFortebetOdds"
)

with open(APP_JS, 'w', encoding='utf-8') as f:
    f.write(app_content)
    print("Refactored app.js")

