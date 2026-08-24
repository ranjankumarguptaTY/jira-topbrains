@echo off
title TopBrains Collaboration Platform Runner
echo ========================================================
echo   Starting TopBrains Unified Chat + Jira Platform...
echo ========================================================
echo.

:: 1. Ensure Data Directory Exists
if not exist "data\db" mkdir "data\db"
if not exist "data\file-transfers" mkdir "data\file-transfers"

:: 2. Find mongod executable
set "MONGOD_EXE=mongod"
if exist "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" (
    set "MONGOD_EXE=C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
) else if exist "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" (
    set "MONGOD_EXE=C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
) else if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" (
    set "MONGOD_EXE=C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
) else if exist "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" (
    set "MONGOD_EXE=C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
)

:: 3. Start MongoDB if not already active on port 27017
echo [1/3] Checking MongoDB...
netstat -ano | findstr :27017 >nul
if %errorlevel% neq 0 (
    echo Starting local MongoDB on port 27017...
    start "TopBrains MongoDB" "%MONGOD_EXE%" --dbpath "%~dp0data\db" --port 27017
    timeout /t 2 /nobreak >nul
) else (
    echo MongoDB is already running on port 27017.
)

:: 4. Start Backend FastAPI Server in new window
echo [2/3] Starting Backend API ^& WebSocket Server (port 8000)...
start "TopBrains Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && call .venv\Scripts\activate && uvicorn app.main:app --port 8000 --reload"

:: 5. Start Frontend Vite Server in new window
echo [3/3] Starting Frontend Vite App (port 5173)...
start "TopBrains Frontend (React/Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================
echo   All servers launched successfully!
echo.
echo   - Frontend PWA:    http://localhost:5173
echo   - Backend API:     http://127.0.0.1:8000
echo   - Swagger Docs:    http://127.0.0.1:8000/docs
echo   - Health Check:    http://127.0.0.1:8000/api/health
echo   - WebSocket URL:   ws://127.0.0.1:8000/ws
echo ========================================================
echo.
pause
