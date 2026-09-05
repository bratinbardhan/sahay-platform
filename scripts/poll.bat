@echo off
cd /d D:\Sahay\sahay-platform
echo === npm processes ===
tasklist 2>nul | findstr /i "npm"
echo === install2.log ===
if exist install2.log ( type install2.log ) else ( echo no install2.log yet )
echo === react at root ===
if exist node_modules\react\package.json ( findstr /c:"\"version\"" node_modules\react\package.json ) else ( echo react not installed yet )
echo === done? ===
findstr /i "INSTALL_DONE" install2.log 2>nul && echo "INSTALL COMPLETE"
findstr /i "EXITCODE" install2.log 2>nul
