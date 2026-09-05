@echo off
setlocal enabledelayedexpansion
cd /d D:\Sahay\sahay-platform
(
  echo === FRESH npm install started ===
  npm install --no-audit --no-fund --prefer-offline --loglevel=error --no-color
  echo === npm install EXITCODE=!ERRORLEVEL! ===
  echo INSTALL_DONE
) > install2.log 2>&1
(
  echo === verifying react hoist ===
  if exist node_modules\react\package.json findstr /c:"\"version\"" node_modules\react\package.json
) >> install2.log
