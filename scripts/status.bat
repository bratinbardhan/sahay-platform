@echo off
cd /d d:\Sahay\sahay-platform
if exist node_modules (echo root nm: EXISTS) else (echo root nm: gone)
if exist node_modules\react\package.json (
  echo react dir present
) else (
  echo react dir MISSING
)
if exist node_modules\.package-lock.json (echo lockfile-marker present) else (echo no lockfile-marker)
tasklist 2>nul | findstr /i "npm"
echo --- npm install log tail (if exists) ---
if exist install.log (
  echo install.log lines:
  powershell -NoProfile -Command "Get-Content install.log -Tail 15"
) else (
  echo no install.log yet
)
