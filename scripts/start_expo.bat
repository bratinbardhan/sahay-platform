@echo off
cd /d D:\Sahay\sahay-platform\apps\mobile
echo EXPO_START_BEGIN > D:\Sahay\sahay-platform\start.log
npx --no-install expo start -c >> D:\Sahay\sahay-platform\start.log 2>&1
echo EXPO_START_EXITCODE=%ERRORLEVEL% >> D:\Sahay\sahay-platform\start.log
