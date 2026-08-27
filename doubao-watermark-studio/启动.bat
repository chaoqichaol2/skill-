@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo 首次运行，正在安装本地处理引擎（约 70 MB）...
  where py >nul 2>nul
  if %errorlevel%==0 (
    py -3.12 -m venv .venv 2>nul || py -3.11 -m venv .venv 2>nul || py -3.10 -m venv .venv
  ) else (
    python -m venv .venv
  )
  if not exist ".venv\Scripts\python.exe" (
    echo.
    echo 需要 Python 3.10 或更高版本。
    echo 请先从 https://www.python.org/downloads/ 安装 Python。
    pause
    exit /b 1
  )
  .venv\Scripts\python.exe -m pip install -r requirements.txt
  if errorlevel 1 (
    echo 安装失败，请检查网络后重试。
    pause
    exit /b 1
  )
)

echo 正在启动豆包水印清理室...
.venv\Scripts\python.exe server.py
