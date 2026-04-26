@echo off
:: SmartFlow Nexus — Windows Startup Script
:: Usage: Double-click start.bat or run from Command Prompt

title SmartFlow Nexus

echo.
echo   ==========================================
echo    SmartFlow Nexus — AI Traffic Management
echo   ==========================================
echo.

:: Check .env files
if not exist "frontend\.env.local" (
    echo [WARNING] frontend\.env.local not found.
    echo           Copying from .env.local.example...
    copy "frontend\.env.local.example" "frontend\.env.local"
    echo [ACTION]  Edit frontend\.env.local with your API keys!
    echo.
)

if not exist "backend\.env" (
    echo [WARNING] backend\.env not found.
    echo           Copying from .env.example...
    copy "backend\.env.example" "backend\.env"
    echo.
)

:: Install frontend deps
echo [1/3] Installing frontend dependencies...
cd frontend
call npm install --legacy-peer-deps
cd ..

:: Install backend deps
echo [2/3] Installing backend dependencies...
cd backend
pip install -r requirements.txt
cd ..

:: Start backend in new window
echo [3/3] Starting backend...
start "SmartFlow Backend" cmd /k "cd backend && python api.py"
timeout /t 3 /nobreak >nul

:: Start frontend in new window
echo Starting frontend...
start "SmartFlow Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo   ==========================================
echo    SmartFlow Nexus is starting!
echo.
echo    Frontend:  http://localhost:9002
echo    Backend:   http://localhost:8000
echo    API Docs:  http://localhost:8000/docs
echo.
echo    Accounts:
echo    Admin:     admin@smartflow.com / admin123
echo    User:      user@smartflow.com  / user123
echo    Emergency: ambulance@smartflow.com / emerg123
echo   ==========================================
echo.
pause
