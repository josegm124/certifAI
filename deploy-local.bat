@echo off
REM CertifAI Local Deployment Script (Windows)
REM Run this script to install dependencies and start both frontend and backend

setlocal enabledelayedexpansion

echo.
echo ==================================================
echo  CertifAI Local Deployment
echo ==================================================
echo.

REM Check if we're in the right directory
if not exist "backend\" (
    echo [ERROR] backend\ folder not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

if not exist "CertifAI_MVP.jsx" (
    echo [ERROR] CertifAI_MVP.jsx not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

REM Install frontend dependencies
echo [1/4] Installing frontend dependencies...
call npm install
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed
echo.

REM Install backend dependencies
echo [2/4] Installing backend dependencies...
cd backend
call npm install
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install backend dependencies
    cd ..
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed
cd ..
echo.

REM Create .env if it doesn't exist
if not exist "backend\.env" (
    echo [3/4] Creating backend\.env file...
    if exist "backend\.env.example" (
        copy backend\.env.example backend\.env
        echo [OK] .env file created from .env.example
    ) else (
        echo [WARNING] .env.example not found, skipping .env creation
    )
) else (
    echo [3/4] .env file already exists
)
echo.

REM Start servers
echo [4/4] Starting servers...
echo.
echo ========================================
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3001
echo ========================================
echo.
echo Press Ctrl+C to stop all servers
echo.

REM Open two new terminals and start servers
echo Starting backend in new terminal...
start cmd /k "cd backend && npm start"

echo Starting frontend in new terminal...
start cmd /k "npm run dev"

echo.
echo [OK] Both servers are starting in separate windows!
echo.
pause
