@echo off
cd /d D:\Sahay\sahay-platform\apps\mobile
echo EXPORT_BEGIN > D:\Sahay\sahay-platform\export.log
node "D:\Sahay\sahay-platform\node_modules\expo\bin\expo.js" export --platform web --dev >> D:\Sahay\sahay-platform\export.log 2>&1
echo EXPORT_EXITCODE=%ERRORLEVEL% >> D:\Sahay\sahay-platform\export.log
