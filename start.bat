@echo off
chcp 65001 >nul
title Discord Bot – Auto Restart & Gateway Refresh

echo ==========================================
echo   Discord Bot Auto-Restart gestartet
echo ==========================================
echo.

:loop
echo [%date% %time%] ▶ Bot startet...
node index.js

echo.
echo [%date% %time%] ⚠ Bot beendet oder abgestürzt
echo [%date% %time%] 🔄 Neustart in 5 Sekunden...
timeout /t 5 /nobreak >nul
echo.

goto loop
