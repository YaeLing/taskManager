@echo off
REM setup.bat -- Install Task Manager dependencies (Windows)
REM
REM Usage:
REM   setup.bat        Standard: install Python backend packages only
REM   setup.bat --dev  Developer: also install frontend Node.js packages (npm install)

setlocal EnableDelayedExpansion

set "DEV=0"
if /i "%~1"=="--dev" set "DEV=1"

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%..\.."
set "ROOT_DIR=%CD%"
popd

echo === Task Manager Setup ===

REM -- Python ----------------------------------------------------------------
set "PYTHON_CMD="

REM Try py launcher first (available in official Python installs)
where py >nul 2>&1
if not errorlevel 1 (
    py --version >nul 2>&1
    if not errorlevel 1 set "PYTHON_CMD=py"
)

REM Fall back to python (skip WindowsApps App Store stub)
if not defined PYTHON_CMD (
    where python >nul 2>&1
    if not errorlevel 1 (
        for /f "delims=" %%p in ('where python') do (
            echo %%p | findstr /i "WindowsApps" >nul
            if errorlevel 1 (
                if not defined PYTHON_CMD set "PYTHON_CMD=python"
            )
        )
    )
)

if not defined PYTHON_CMD (
    echo [ERROR] Python not found (Windows Store placeholder does not count^)
    echo         Install Python 3.10+ from https://www.python.org/downloads/
    echo         Remember to check "Add Python to PATH" during install
    pause
    exit /b 1
)

set "PYVER="
for /f "tokens=2" %%v in ('"%PYTHON_CMD%" --version 2^>^&1') do set "PYVER=%%v"

if not defined PYVER (
    echo [ERROR] Cannot get Python version, check your installation
    pause & exit /b 1
)

set "PY_MAJOR=" & set "PY_MINOR="
for /f "tokens=1,2 delims=." %%a in ("%PYVER%") do (
    set "PY_MAJOR=%%a"
    set "PY_MINOR=%%b"
)
echo [OK] Python %PYVER% (command: %PYTHON_CMD%)

if not defined PY_MAJOR (
    echo [ERROR] Cannot parse Python version: %PYVER%
    pause & exit /b 1
)
if %PY_MAJOR% LSS 3 (
    echo [ERROR] Requires Python 3.10+, found %PYVER%
    pause & exit /b 1
)
if %PY_MAJOR% EQU 3 if %PY_MINOR% LSS 10 (
    echo [ERROR] Requires Python 3.10+, found %PYVER%
    pause & exit /b 1
)

echo Installing backend packages (fastapi, uvicorn, python-pptx^)...
%PYTHON_CMD% -m pip install -r "%ROOT_DIR%\backend\requirements.txt" --quiet
if errorlevel 1 (
    echo [ERROR] Backend package install failed
    pause & exit /b 1
)
echo [OK] Backend packages installed

REM -- Node.js (--dev mode) --------------------------------------------------
if "%DEV%"=="1" (
    echo.
    where node >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Node.js not found, please install Node.js 18+
        echo         Download: https://nodejs.org/
        pause & exit /b 1
    )
    where npm >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] npm not found
        pause & exit /b 1
    )
    for /f "tokens=*" %%v in ('node --version') do echo [OK] Node.js %%v
    echo Installing frontend packages (vue, vite, pinia^)...
    npm --prefix "%ROOT_DIR%\frontend" install --silent
    if errorlevel 1 (
        echo [ERROR] Frontend package install failed
        pause & exit /b 1
    )
    echo [OK] Frontend packages installed
)

echo.
if "%DEV%"=="1" (
    echo [OK] Setup complete (dev mode^)
    echo      Start server : start.bat
    echo      Frontend dev : cd frontend ^&^& npm run dev
    echo      Rebuild      : start.bat --build  or  cd frontend ^&^& npm run build
) else (
    echo [OK] Setup complete
    echo      Start server : start.bat
)
pause
