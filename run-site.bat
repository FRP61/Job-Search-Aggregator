@echo off
rem Starts the whole site on this computer: backend (port 8000) + frontend (port 5173).
rem Needs Python 3.12+ and Node.js 20+. The first run installs everything (a few minutes).
rem Data is stored in backend\jobs.db (SQLite), no Docker or Postgres needed.
setlocal
set ROOT=%~dp0
set BACK=%ROOT%backend
set FRONT=%ROOT%frontend

if not exist "%BACK%\.venv\Scripts\python.exe" (
  echo [1/3] Installing backend...
  python -m venv "%BACK%\.venv" || goto :fail
  "%BACK%\.venv\Scripts\python.exe" -m pip install -q -r "%BACK%\requirements-dev.txt" || goto :fail
)
if not exist "%FRONT%\node_modules" (
  echo [2/3] Installing frontend...
  pushd "%FRONT%" && call npm install && popd || goto :fail
)

echo [3/3] Starting...
start "Backend - do not close" cmd /k "cd /d %BACK% && set DATABASE_URL=sqlite+aiosqlite:///./jobs.db && .venv\Scripts\python.exe -m alembic upgrade head && .venv\Scripts\python.exe -m app.seed && .venv\Scripts\python.exe -m uvicorn app.main:app --port 8000"
start "Frontend - do not close" cmd /k "cd /d %FRONT% && npm run dev -- --open"

echo.
echo Site: http://localhost:5173   (API docs: http://localhost:8000/docs)
echo Vacancies are loaded separately: run load-vacancies.bat
exit /b 0

:fail
echo Setup failed. Check that Python 3.12+ and Node.js are installed.
pause
exit /b 1
