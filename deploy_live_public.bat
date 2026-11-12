@echo off
title EduPulse AI - Deploy Live Public Website
cd /d "%~dp0"
echo ===============================================================
echo   EDUPULSE.AI - DEPLOY LIVE PUBLIC WEBSITE
echo ===============================================================
echo.
echo Launching Cloudflare live edge deployment on port 5000...
echo.
if not exist "cloudflared.exe" (
    echo Downloading cloudflared agent...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
)
echo.
echo ===============================================================
echo   Broadcasting live public website to the internet...
echo ===============================================================
echo.
.\cloudflared.exe tunnel --url http://127.0.0.1:5000
pause
