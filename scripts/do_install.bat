@echo off
setlocal enabledelayedexpansion
cd /d D:\Sahay\sahay-platform
(
  echo === CLEANING ===
  rmdir /s /q node_modules 2>nul
  rmdir /s /q apps\mobile\node_modules 2>nul
  rmdir /s /q apps\web\node_modules 2>nul
  rmdir /s /q packages\types\node_modules 2>nul
  del package-lock.json 2>nul
  rmdir /s /q apps\mobile\.expo 2>nul
  echo === RUNNING npm install (fresh, lockfile deleted) ===
  npm install --no-audit --no-fund --prefer-offline --loglevel=error --no-color
  echo === npm install EXITCODE=!ERRORLEVEL! ===
) > install.log 2>&1
