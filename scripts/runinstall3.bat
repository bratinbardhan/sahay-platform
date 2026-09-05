@echo off
setlocal enabledelayedexpansion
cd /d D:\Sahay\sahay-platform
taskkill /f /im npm.exe 2>nul
taskkill /f /im node.exe 2>nul
rmdir /s /q node_modules 2>nul
rmdir /s /q apps\mobile\node_modules 2>nul
rmdir /s /q apps\web\node_modules 2>nul
rmdir /s /q packages\types\node_modules 2>nul
rmdir /s /q apps\mobile\.expo 2>nul
(
  echo === npm install (lockfile preserved + overrides forcing react@19.1.0/react-dom@19.1.0) ===
  npm install --no-audit --no-fund --prefer-offline --loglevel=error --no-color
  echo === INSTALL_EXITCODE=!ERRORLEVEL! ===
) > install3.log 2>&1
(
  echo === post-install react hoist check ===
  if exist node_modules\react\package.json findstr /c:"\"version\"" node_modules\react\package.json
  if exist node_modules\react-dom\package.json findstr /c:"\"version\"" node_modules\react-dom\package.json
  echo INSTALL3_DONE
) >> install3.log
