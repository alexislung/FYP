@echo off
title EasyJob Server
cd /d "%~dp0"

if exist ".env" goto startpy

if "%DEEPSEEK_API_KEY%"=="" (
  echo [ERROR] Missing DEEPSEEK_API_KEY.
  echo Fix: copy .env.example to .env and fill in values, OR run set_env.bat then open a NEW cmd window.
  pause
  exit /b 1
)

if "%DATABASE_URL%"=="" (
  echo [ERROR] Missing DATABASE_URL.
  echo Fix: copy .env.example to .env and set DATABASE_URL=postgresql://..., OR run set_env.bat then open a NEW cmd window.
  pause
  exit /b 1
)

:startpy

echo Starting web server...
start "" "http://127.0.0.1:8000/index.html"
python server.py
pause
