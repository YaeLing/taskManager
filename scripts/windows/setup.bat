@echo off
REM setup.bat — 安裝 Task Manager 所需套件（Windows）
REM
REM 用法：
REM   setup.bat        一般使用者：僅安裝 Python 後端套件
REM   setup.bat --dev  開發者：另外安裝前端 Node.js 套件（npm install）

setlocal EnableDelayedExpansion

set "DEV=0"
if /i "%~1"=="--dev" set "DEV=1"

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%..\.."
set "ROOT_DIR=%CD%"
popd

echo === Task Manager Setup ===

REM ── Python ─────────────────────────────────────────────────────
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] 找不到 Python，請先安裝 Python 3.10+
    echo 下載：https://www.python.org/downloads/
    pause
    exit /b 1
)

for /f "tokens=2" %%v in ('python --version 2^>^&1') do set "PYVER=%%v"
for /f "tokens=1,2 delims=." %%a in ("%PYVER%") do (
    set "PY_MAJOR=%%a"
    set "PY_MINOR=%%b"
)
echo [OK] Python %PYVER%

if %PY_MAJOR% LSS 3 (
    echo [ERROR] 需要 Python 3.10 以上，目前為 %PYVER%
    pause & exit /b 1
)
if %PY_MAJOR% EQU 3 if %PY_MINOR% LSS 10 (
    echo [ERROR] 需要 Python 3.10 以上，目前為 %PYVER%
    pause & exit /b 1
)

echo 安裝後端套件（fastapi, uvicorn, python-pptx）...
python -m pip install -r "%ROOT_DIR%\backend\requirements.txt" --quiet
if errorlevel 1 (
    echo [ERROR] 後端套件安裝失敗
    pause & exit /b 1
)
echo [OK] 後端套件完成

REM ── Node.js（--dev 模式）────────────────────────────────────────
if "%DEV%"=="1" (
    echo.
    where node >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] 找不到 Node.js，請先安裝 Node.js 18+
        echo 下載：https://nodejs.org/
        pause & exit /b 1
    )
    where npm >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] 找不到 npm
        pause & exit /b 1
    )
    for /f "tokens=*" %%v in ('node --version') do echo [OK] Node.js %%v
    echo 安裝前端套件（vue, vite, pinia）...
    npm --prefix "%ROOT_DIR%\frontend" install --silent
    if errorlevel 1 (
        echo [ERROR] 前端套件安裝失敗
        pause & exit /b 1
    )
    echo [OK] 前端套件完成
)

echo.
if "%DEV%"=="1" (
    echo [OK] 安裝完成（開發模式）
    echo      執行伺服器：start.bat
    echo      前端開發：  cd frontend ^&^& npm run dev
    echo      重新 Build：start.bat --build  或  cd frontend ^&^& npm run build
) else (
    echo [OK] 安裝完成
    echo      執行伺服器：start.bat
)
pause
