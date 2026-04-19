@echo off
setlocal
title EasyJob Environment Setup
cd /d "%~dp0"

echo.
echo === EasyJob Environment Setup ===
echo This will save environment variables for your Windows user account.
echo.
echo You need:
echo   1) DEEPSEEK_API_KEY  (starts with sk-)
echo   2) DATABASE_URL      (starts with postgresql://)
echo   3) ALLOWED_ORIGINS   (press Enter for default localhost values)
echo.

set /p DEEPSEEK_API_KEY=Enter DEEPSEEK_API_KEY: 
if "%DEEPSEEK_API_KEY%"=="" (
  echo [ERROR] DEEPSEEK_API_KEY cannot be empty.
  pause
  exit /b 1
)

set /p DATABASE_URL=Enter DATABASE_URL: 
if "%DATABASE_URL%"=="" (
  echo [ERROR] DATABASE_URL cannot be empty.
  pause
  exit /b 1
)

echo %DATABASE_URL% | findstr /b /c:"postgresql://" >nul
if errorlevel 1 (
  echo [ERROR] DATABASE_URL must start with postgresql://
  pause
  exit /b 1
)

set /p ALLOWED_ORIGINS=Enter ALLOWED_ORIGINS (default: http://localhost:8000,http://127.0.0.1:8000): 
if "%ALLOWED_ORIGINS%"=="" set "ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000"

echo.
echo Saving variables...
setx DEEPSEEK_API_KEY "%DEEPSEEK_API_KEY%" >nul
setx DATABASE_URL "%DATABASE_URL%" >nul
setx ALLOWED_ORIGINS "%ALLOWED_ORIGINS%" >nul

set "DEEPSEEK_API_KEY=%DEEPSEEK_API_KEY%"
set "DATABASE_URL=%DATABASE_URL%"
set "ALLOWED_ORIGINS=%ALLOWED_ORIGINS%"

echo.
echo [OK] Variables saved.
echo Please close this window and open a new terminal before running run_website.bat.
echo.
echo Optional (privacy): set user variable EASYJOB_ENV_FILE to a path OUTSIDE this folder
echo   (e.g. %%LOCALAPPDATA%%\EasyJob\secrets.env) and put DATABASE_URL=... there instead of .env
echo.
pause
