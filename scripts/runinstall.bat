@echo off
cd /d d:\Sahay\sahay-platform
echo INSTALL_BEGIN > install.log
rmdir /s /q node_modules 2>nul
rmdir /s /q apps\mobile\node_modules 2>nul
rmdir /s /q apps\web\node_modules 2>nul
rmdir /s /q packages\types\node_modules 2>nul
echo cleaned, starting npm install... >> install.log
npm install --no-audit --no-fund --loglevel=error --no-color >> install.log 2>&1
echo INSTALL_DONE >> install.log
