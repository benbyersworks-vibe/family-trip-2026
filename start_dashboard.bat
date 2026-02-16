@echo off
echo Stopping any running servers...
taskkill /F /IM node.exe >nul 2>&1
echo Starting Dashboard Server...
start "" "http://localhost:3000"
node dashboard-server.js
pause
