@echo off
cd /d D:\Sahay\sahay-platform
echo Killing stray node/npm processes...
taskkill /f /im npm.exe 2>nul
taskkill /f /im node.exe 2>nul
taskkill /f /im expo.exe 2>nul
echo Removing stale lockfile + node_modules + logs...
del package-lock.json 2>nul
rmdir /s /q node_modules 2>nul
rmdir /s /q apps\mobile\node_modules 2>nul
rmdir /s /q apps\web\node_modules 2>nul
rmdir /s /q packages\types\node_modules 2>nul
rmdir /s /q apps\mobile\.expo 2>nul
del install.log 2>nul
del install2.log 2>nul
echo --- VERIFY ---
if exist package-lock.json (echo lockfile: EXISTS - WARNING) else (echo lockfile: DELETED)
if exist node_modules (echo root nm: EXISTS - WARNING) else (echo root nm: gone)
if exist apps\mobile\node_modules (echo mobile nm: EXISTS - WARNING) else (echo mobile nm: gone)
echo DONE-CLEAN
