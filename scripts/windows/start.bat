@echo off
REM start.bat -- Start / Stop Task Manager server (Windows)
REM
REM Usage:
REM   start.bat [--build]            Foreground (Ctrl+C to stop)
REM   start.bat start [--build]      Background
REM   start.bat stop                 Stop background server
REM   start.bat restart [--build]    Restart background server
REM   start.bat status               Check server status
REM
REM   --build  Run npm run build before starting

setlocal EnableDelayedExpansion

REM Resolve project root (two levels above scripts\windows)
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%..\.."
set "ROOT_DIR=%CD%"
popd
set "BACKEND_DIR=%ROOT_DIR%\backend"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "PID_FILE=%ROOT_DIR%\server.pid"
set "LOG_FILE=%ROOT_DIR%\server.log"

REM Detect Python command (prefer py launcher, skip WindowsApps stub)
call :detect_python
if errorlevel 1 exit /b 1

REM Parse args: --build can appear anywhere
set "BUILD=0"
set "CMD="
for %%a in (%*) do (
    if /i "%%a"=="--build" (
        set "BUILD=1"
    ) else if not defined CMD (
        set "CMD=%%a"
    )
)
if "%CMD%"=="" set "CMD=fg"

if /i "%CMD%"=="fg"      goto :maybe_build
if /i "%CMD%"=="start"   goto :maybe_build
if /i "%CMD%"=="stop"    goto :stop
if /i "%CMD%"=="restart" goto :maybe_build
if /i "%CMD%"=="status"  goto :status
echo Usage: start.bat [start^|stop^|restart^|status] [--build]
exit /b 1

:maybe_build
if "%BUILD%"=="1" (
    call :build_frontend
    if errorlevel 1 exit /b 1
)
if /i "%CMD%"=="fg"      goto :fg
if /i "%CMD%"=="start"   goto :start
if /i "%CMD%"=="restart" goto :restart
goto :eof

:build_frontend
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found, cannot build frontend (install Node.js first^)
    exit /b 1
)
if not exist "%FRONTEND_DIR%\node_modules" (
    echo [INFO] node_modules not found, running npm install first...
    npm --prefix "%FRONTEND_DIR%" install --silent
    if errorlevel 1 (
        echo [ERROR] npm install failed
        exit /b 1
    )
)
echo [BUILD] Building frontend...
call npm --prefix "%FRONTEND_DIR%" run build
if errorlevel 1 (
    echo [ERROR] Frontend build failed
    exit /b 1
)
echo [OK] Frontend build complete
echo.
exit /b 0

:fg
echo === Task Manager ===
echo Foreground  ^|  http://localhost:8080  ^|  Ctrl+C to stop
echo.
cd /d "%BACKEND_DIR%"
%PYTHON_CMD% server.py
goto :eof

:start
if exist "%PID_FILE%" (
    set /p OLD_PID=<"%PID_FILE%"
    tasklist /FI "PID eq !OLD_PID!" 2>nul | find "!OLD_PID!" >nul
    if not errorlevel 1 (
        echo [WARN] Server already running in background ^(PID !OLD_PID!^)
        echo        Run start.bat stop first, or start.bat restart to restart
        exit /b 1
    )
)
cd /d "%BACKEND_DIR%"
start "" /b %PYTHON_CMD% server.py >> "%LOG_FILE%" 2>&1
timeout /t 1 /nobreak >nul
REM Get latest python.exe PID via PowerShell
set "NEW_PID="
for /f %%p in ('powershell -NoProfile -Command "(Get-Process python -ErrorAction SilentlyContinue | Sort-Object StartTime -Descending | Select-Object -First 1).Id"') do set "NEW_PID=%%p"
REM Fallback: get first python.exe from tasklist
if not defined NEW_PID (
    for /f "tokens=2" %%p in ('tasklist /FI "IMAGENAME eq python.exe" /NH 2^>nul') do (
        if not defined NEW_PID set "NEW_PID=%%p"
    )
)
echo !NEW_PID!> "%PID_FILE%"
echo [OK] Server started in background ^(PID !NEW_PID!^)
echo      URL : http://localhost:8080
echo      Log : %LOG_FILE%
echo      Stop: start.bat stop
goto :eof

:stop
if not exist "%PID_FILE%" (
    echo [WARN] PID file not found, server may not be running in background
    exit /b 0
)
set /p KILL_PID=<"%PID_FILE%"
taskkill /PID %KILL_PID% /F >nul 2>&1
if errorlevel 1 (
    echo [WARN] PID %KILL_PID% no longer exists
) else (
    echo [OK] Server stopped ^(PID %KILL_PID%^)
)
del "%PID_FILE%" >nul 2>&1
goto :eof

:restart
call :stop
timeout /t 1 /nobreak >nul
goto :start

:status
if not exist "%PID_FILE%" (
    echo [--] Not running
    exit /b 0
)
set /p CHECK_PID=<"%PID_FILE%"
tasklist /FI "PID eq %CHECK_PID%" 2>nul | find "%CHECK_PID%" >nul
if errorlevel 1 (
    echo [--] Not running ^(stale PID file removed^)
    del "%PID_FILE%" >nul 2>&1
) else (
    echo [OK] Running ^(PID %CHECK_PID%^)  http://localhost:8080
)
goto :eof

:detect_python
set "PYTHON_CMD="
where py >nul 2>&1
if not errorlevel 1 (
    py --version >nul 2>&1
    if not errorlevel 1 set "PYTHON_CMD=py"
)
if not defined PYTHON_CMD (
    where python >nul 2>&1
    if not errorlevel 1 (
        for /f "delims=" %%p in ('where python') do (
            echo %%p | findstr /i "WindowsApps" >nul
            if errorlevel 1 if not defined PYTHON_CMD set "PYTHON_CMD=python"
        )
    )
)
if not defined PYTHON_CMD (
    echo [ERROR] Python not found, run setup.bat first
    exit /b 1
)
exit /b 0
