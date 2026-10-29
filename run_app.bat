@echo off
title Student Feedback Analyzer - NLP Web App
echo ===============================================================
echo  STARTING STUDENT FEEDBACK ANALYZER (NLP MINI PROJECT WEB APP)
echo ===============================================================
echo.
echo [1/2] Verifying Python packages...
pip install -r backend\requirements.txt
echo.
echo [2/2] Launching Backend Server on http://127.0.0.1:5000 ...
echo Press Ctrl+C in this terminal window to stop the server.
echo.
python backend\app.py
pause
