@echo off
setlocal

rem ===========================================================================
rem DepthWizard — Standalone Windows Launcher (SIH PS 26175)
rem Launches the integrated FastAPI service and Three.js frontend.
rem ===========================================================================

rem Ensure working directory is the project root containing this script
cd /d "%~dp0"

echo =======================================================================
echo DepthWizard — Overhead Optical Terrain Intelligence (SIH 2026 PS 26175)
echo =======================================================================
echo Starting integrated application server...
echo Project directory: %CD%

rem Set Python path to project root for backend module discovery
set PYTHONPATH=.

rem Set offline mode for Hugging Face if cached model is available
if not defined HF_HUB_OFFLINE (
    set HF_HUB_OFFLINE=1
)

rem Open default browser once the server socket has initialized
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:8000"

rem Launch the unified FastAPI backend (serves frontend/dist + /api/*)
python -m backend.main

if errorlevel 1 (
    echo.
    echo =======================================================================
    echo ERROR: DepthWizard backend exited with an error code.
    echo Please verify Python 3.11 environment and requirements:
    echo   pip install -r requirements.txt
    echo =======================================================================
    pause
)
