@echo off
cd /d d:\Sahay\sahay-platform
echo Cleaning node_modules and caches...
if exist node_modules rmdir /s /q node_modules
if exist apps\mobile\node_modules rmdir /s /q apps\mobile\node_modules
if exist apps\web\node_modules rmdir /s /q apps\web\node_modules
if exist packages\types\node_modules rmdir /s /q packages\types\node_modules
if exist apps\mobile\.expo rmdir /s /q apps\mobile\.expo
if exist "%USERPROFILE%\.metro-cache" rmdir /s /q "%USERPROFILE%\.metro-cache"
echo --- remaining checks ---
if exist node_modules (echo root nm: EXISTS) else (echo root nm: gone)
if exist apps\mobile\node_modules (echo mobile nm: EXISTS) else (echo mobile nm: gone)
if exist apps\web\node_modules (echo web nm: EXISTS) else (echo web nm: gone)
if exist apps\mobile\.expo (echo mobile .expo: EXISTS) else (echo mobile .expo: gone)
echo DONE
