@echo off
cd /d D:\Sahay\sahay-platform
echo === processes (cmd/node/npm/expo) ===
tasklist 2>nul | findstr /i "node npm expo"
echo.
echo === install2.out (Start-Process stdout capture) ===
if exist install2.out ( type install2.out ) else ( echo (none) )
echo.
echo === install2.err (Start-Process stderr capture) ===
if exist install2.err ( type install2.err ) else ( echo (none) )
echo.
echo === install2.log (batch-internal redirect) ===
if exist install2.log ( type install2.log ) else ( echo (none) )
echo.
echo === node_modules/react ===
if exist node_modules\react\package.json ( findstr /c:"\"version\"" node_modules\react\package.json ) else ( echo react not installed )
echo === install2.log size ===
if exist install2.log for %%I in (install2.log) do echo bytes: %%~zI
