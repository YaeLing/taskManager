@echo off
REM setup.bat — 安裝 Task Manager 所需套件（Windows）

echo === Task Manager Setup ===

where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] 找不到 Python，請先安裝 Python 3.8+
    echo 下載：https://www.python.org/downloads/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do echo [OK] %%i

echo 安裝 python-pptx...
python -m pip install python-pptx --quiet
if errorlevel 1 (
    echo [ERROR] 安裝 python-pptx 失敗，請確認 pip 可用
    pause
    exit /b 1
)

echo.
echo [OK] 安裝完成！執行 start.bat 啟動伺服器。
pause
