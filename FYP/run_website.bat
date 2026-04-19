@echo off
title EasyJob Server
cd /d "%~dp0"

echo.
echo === EasyJob server ===
echo Database: edit database.py _DEFAULT_DATABASE_URL (or set DATABASE_URL).
echo DeepSeek: edit server.py _DEFAULT_DEEPSEEK_API_KEY (or set DEEPSEEK_API_KEY).
echo.
echo Starting web server...
start "" "http://127.0.0.1:8000/index.html"
python server.py
if errorlevel 1 (
  echo.
  echo [ERROR] Python exited with an error. Read the messages above.
)
echo.
pause
