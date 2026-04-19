@echo off
title EasyJob Server
cd /d "%~dp0"

echo.
echo === EasyJob server ===
echo Folder: %CD%
echo Database: edit database.py _DEFAULT_DATABASE_URL (pooler port 6543 if direct 5432 / IPv6 fails).
echo DeepSeek: edit server.py _DEFAULT_DEEPSEEK_API_KEY (or set DEEPSEEK_API_KEY).
echo.
echo Installing Python packages from this folder (requirements.txt)...
python -m pip install -r "%~dp0requirements.txt"
if errorlevel 1 (
  echo [WARN] pip install had a problem. Fix errors above, or run manually:
  echo   cd /d "%~dp0"
  echo   python -m pip install -r requirements.txt
  echo.
)
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
