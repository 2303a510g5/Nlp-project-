@echo off
title Push to GitHub - 2303a510g5/Nlp-project-
echo =======================================================
echo   PUSHING NLP PROJECT TO GITHUB
echo   Repository: https://github.com/2303a510g5/Nlp-project-
echo =======================================================
echo.
echo Your computer currently has GitHub credentials for a different account (2303A51184).
echo We need to authenticate as: 2303a510g5
echo.
echo [1/2] Opening GitHub Authentication in your browser...
gh auth login -h github.com -p https --web
echo.
echo [2/2] Pushing files to main branch...
git push -u origin main
echo.
echo =======================================================
echo   PUSH COMPLETE!
echo =======================================================
pause
