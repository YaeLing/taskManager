@echo off
REM start.bat — 啟動 / 停止 Task Manager 伺服器（Windows）
REM
REM 用法：
REM   start.bat [--build]            前景執行（Ctrl+C 停止）
REM   start.bat start [--build]      背景執行
REM   start.bat stop                 停止背景伺服器
REM   start.bat restart [--build]    重啟背景伺服器
REM   start.bat status               查看執行狀態
REM
REM   --build  啟動前先執行 npm run build 更新前端

setlocal EnableDelayedExpansion

REM 計算專案根目錄（scripts\windows 的上兩層）
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%..\.."
set "ROOT_DIR=%CD%"
popd
set "BACKEND_DIR=%ROOT_DIR%\backend"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "PID_FILE=%ROOT_DIR%\server.pid"
set "LOG_FILE=%ROOT_DIR%\server.log"

REM 解析參數：--build 可出現在任意位置
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
echo 用法：start.bat [start^|stop^|restart^|status] [--build]
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
    echo [ERROR] 找不到 npm，無法 build 前端（請先安裝 Node.js）
    exit /b 1
)
echo [BUILD] Building frontend...
call npm --prefix "%FRONTEND_DIR%" run build
if errorlevel 1 (
    echo [ERROR] 前端 build 失敗
    exit /b 1
)
echo [OK] Frontend build 完成
echo.
exit /b 0

:fg
echo === Task Manager ===
echo 前景模式  ^|  http://localhost:8080  ^|  Ctrl+C 停止
echo.
cd /d "%BACKEND_DIR%"
python server.py
goto :eof

:start
if exist "%PID_FILE%" (
    set /p OLD_PID=<"%PID_FILE%"
    tasklist /FI "PID eq !OLD_PID!" 2>nul | find "!OLD_PID!" >nul
    if not errorlevel 1 (
        echo [WARN] 伺服器已在背景執行 ^(PID !OLD_PID!^)
        echo        執行 start.bat stop 先停止，或 start.bat restart 重啟
        exit /b 1
    )
)
cd /d "%BACKEND_DIR%"
start /b python server.py >> "%LOG_FILE%" 2>&1
REM 取得剛啟動的 python PID
timeout /t 1 /nobreak >nul
for /f "tokens=2" %%p in ('tasklist /FI "IMAGENAME eq python.exe" /NH 2^>nul ^| findstr /n "." ^| findstr "^1:"') do (
    set "NEW_PID=%%p"
)
REM fallback: 取最新 python process
if not defined NEW_PID (
    for /f "tokens=2" %%p in ('tasklist /FI "IMAGENAME eq python.exe" /NH 2^>nul') do (
        set "NEW_PID=%%p"
    )
)
echo !NEW_PID!> "%PID_FILE%"
echo [OK] 伺服器已在背景啟動 ^(PID !NEW_PID!^)
echo      網址：http://localhost:8080
echo      日誌：%LOG_FILE%
echo      停止：start.bat stop
goto :eof

:stop
if not exist "%PID_FILE%" (
    echo [WARN] 找不到 PID 檔，伺服器可能未在背景執行
    exit /b 0
)
set /p KILL_PID=<"%PID_FILE%"
taskkill /PID %KILL_PID% /F >nul 2>&1
if errorlevel 1 (
    echo [WARN] PID %KILL_PID% 已不存在
) else (
    echo [OK] 伺服器已停止 ^(PID %KILL_PID%^)
)
del "%PID_FILE%" >nul 2>&1
goto :eof

:restart
call :stop
timeout /t 1 /nobreak >nul
goto :start

:status
if not exist "%PID_FILE%" (
    echo [--] 未執行
    exit /b 0
)
set /p CHECK_PID=<"%PID_FILE%"
tasklist /FI "PID eq %CHECK_PID%" 2>nul | find "%CHECK_PID%" >nul
if errorlevel 1 (
    echo [--] 未執行 ^(PID 檔殘留，已清除^)
    del "%PID_FILE%" >nul 2>&1
) else (
    echo [OK] 執行中 ^(PID %CHECK_PID%^)  http://localhost:8080
)
goto :eof
