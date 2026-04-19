@echo off
title EasyJob Server
cd /d "%~dp0"

if "%DEEPSEEK_API_KEY%"=="" (
  echo [ERROR] Missing DEEPSEEK_API_KEY.
  echo Please run set_env.bat first, then open a new terminal and retry.
  pause
  exit /b 1
)

if "%DATABASE_URL%"=="" (
  echo [ERROR] Missing DATABASE_URL.
  echo Please run set_env.bat first, then open a new terminal and retry.
  pause
  exit /b 1
)

echo Starting web server...
start "" "http://127.0.0.1:8000/index.html"
python server.py
pause
