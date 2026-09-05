@echo off
cd /d D:\Sahay\sahay-platform
echo FRESH_INSTALL_BEGIN > install2.log
echo lockfile deleted => fresh resolve (react/react-dom 19.1.0 from package.json) >> install2.log
npm install --no-audit --no-fund --prefer-offline --loglevel=error --no-color >> install2.log 2>&1
echo FRESH_INSTALL_EXITCODE=%ERRORLEVEL% >> install2.log
