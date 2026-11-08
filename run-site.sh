#!/usr/bin/env bash
# Starts the whole site (macOS / Linux): backend on :8000 + frontend on :5173.
# Needs Python 3.12+ and Node.js 20+. Data is stored in backend/jobs.db (SQLite).
# Vacancies are loaded separately:  ./run-site.sh load
set -e
cd "$(dirname "$0")"
export DATABASE_URL="sqlite+aiosqlite:///./jobs.db"

if [ ! -x backend/.venv/bin/python ]; then
  python3 -m venv backend/.venv
  backend/.venv/bin/pip install -q -r backend/requirements-dev.txt
fi
[ -d frontend/node_modules ] || (cd frontend && npm install)

if [ "$1" = "load" ]; then
  cd backend
  for s in cv_lv cv_ee cv_lt justjoin bundesagentur jobtech; do
    echo "=== $s ==="; .venv/bin/python -m app.cli refresh-source "$s"
  done
  exit 0
fi

(cd backend && .venv/bin/python -m alembic upgrade head && .venv/bin/python -m app.seed \
  && .venv/bin/python -m uvicorn app.main:app --port 8000) &
trap 'kill 0' EXIT
cd frontend && npm run dev
