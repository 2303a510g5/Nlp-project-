@echo off
title Push to GitHub - 2303a510g5/Nlp-project-
cd /d "%~dp0"
echo ===============================================================
echo   STUDENT FEEDBACK ANALYZER - PUSH TO GITHUB
echo   Repository: https://github.com/2303a510g5/Nlp-project-
echo ===============================================================
echo.
echo Pushing committed files to GitHub main branch...
echo If a browser window appears, please authorize as: 2303a510g5
echo.
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ===============================================================
    echo   SUCCESS! Project uploaded to:
    echo   https://github.com/2303a510g5/Nlp-project-
    echo ===============================================================
) else (
    echo ===============================================================
    echo   Authentication required. Please authorize in your browser.
    echo ===============================================================
)
pause
