@echo off
rem Downloads vacancies from all job sources into backend\jobs.db (one by one, a few minutes).
rem The backend can stay running: new vacancies appear in the search right away.
setlocal
cd /d "%~dp0backend"
set DATABASE_URL=sqlite+aiosqlite:///./jobs.db
for %%S in (cv_lv cv_ee cv_lt justjoin bundesagentur jobtech) do (
  echo === %%S ===
  .venv\Scripts\python.exe -m app.cli refresh-source %%S
)
echo Done.
pause
