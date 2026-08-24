#!/bin/bash
echo "========================================================"
echo "  Starting TopBrains Unified Chat + Jira Platform..."
echo "========================================================"

mkdir -p data/db data/file-transfers

# Check MongoDB
if ! nc -z localhost 27017 2>/dev/null; then
    echo "[1/3] Starting MongoDB..."
    mongod --dbpath "./data/db" --port 27017 &
else
    echo "[1/3] MongoDB already running."
fi

# Start Backend
echo "[2/3] Starting Backend API..."
cd backend
source .venv/bin/activate
uvicorn app.main:app --port 8000 --reload &
cd ..

# Start Frontend
echo "[3/3] Starting Frontend App..."
cd frontend
npm run dev &
cd ..

echo "All servers running in background."
wait
