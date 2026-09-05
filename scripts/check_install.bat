@echo off
cd /d d:\Sahay\sahay-platform
echo === npm processes ===
tasklist 2>nul | findstr /i "npm"
echo === install.log ===
if exist install.log (
  type install.log
) else (
  echo no install.log
)
echo === node_modules/react check ===
if exist node_modules\react\package.json (
  findstr /c:"\"version\"" node_modules\react\package.json
) else (
  echo react NOT installed yet
)
echo === marker check ===
findstr /i "INSTALL_DONE" install.log 2>nul && echo "INSTALL COMPLETE"
