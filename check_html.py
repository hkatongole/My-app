import os

pages_dir = r'C:\Users\hkatongole\Downloads\plusone-web\plusone-web\assets\js\pages'
auth_dir  = r'C:\Users\hkatongole\Downloads\plusone-web\plusone-web\assets\js\auth'
app_js    = open(r'C:\Users\hkatongole\Downloads\plusone-web\plusone-web\assets\js\app.js', encoding='utf-8').read()
css       = open(r'C:\Users\hkatongole\Downloads\plusone-web\plusone-web\assets\css\styles.css', encoding='utf-8').read()
html      = open(r'C:\Users\hkatongole\Downloads\plusone-web\plusone-web\index.html', encoding='utf-8').read()

print('=== New Page Files ===')
for f in ['injuries.js','howItWorks.js','terms.js','privacy.js','login.js','admin.js']:
    status = 'OK' if os.path.exists(os.path.join(pages_dir, f)) else 'MISSING'
    print(f'  {status}: pages/{f}')

print()
print('=== Auth Files ===')
for f in ['authService.js']:
    status = 'OK' if os.path.exists(os.path.join(auth_dir, f)) else 'MISSING'
    print(f'  {status}: auth/{f}')

print()
print('=== Routes in app.js ===')
for route in ['/injuries','/how-it-works','/terms','/privacy','/login','/admin']:
    status = 'OK' if route in app_js else 'MISSING'
    print(f'  {status}: {route}')

print()
print('=== CSS Classes ===')
for cls in ['login-card','login-btn','login-notice','admin-user-card','admin-stat-card','admin-health-dot','nav-user-badge']:
    status = 'OK' if cls in css else 'MISSING'
    print(f'  {status}: .{cls}')

print()
print('=== HTML Nav Links ===')
for lnk in ['nav-login-link','nav-admin-link','nav-user-badge']:
    status = 'OK' if lnk in html else 'MISSING'
    print(f'  {status}: #{lnk}')
