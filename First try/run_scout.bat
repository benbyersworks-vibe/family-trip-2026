@echo off
echo ==========================================
echo   Family Trip 2026 - Stay Scout Agent
echo ==========================================
echo.
echo Fetching live vacation rental data from Google...
echo.

node fetch_stays.js

echo.
if exist stays_data.json (
    echo SUCCESS! New data saved to stays_data.json.
    echo You can now refresh your Dashboard.
) else (
    echo FAILURE. No data file was created.
    echo Please check the error message above.
)
echo.
echo Press any key to close this window...
pause >nul
