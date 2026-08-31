@echo off
cd /d "%~dp0"

:: Toggle behavior: stop if running, start if not
netstat -ano | findstr :8000 >nul && goto stop
netstat -ano | findstr :5173 >nul && goto stop

:start
echo Starting Backend (Django)...
if exist "venv\Scripts\activate.bat" (
    start "DECKKNOB_BACKEND" /min cmd /c "call venv\Scripts\activate.bat && cd backend && python manage.py runserver 127.0.0.1:8000"
) else (
    start "DECKKNOB_BACKEND" /min cmd /c "cd backend && python manage.py runserver 127.0.0.1:8000"
)

echo Starting Frontend (Vite)...
start "DECKKNOB_FRONTEND" /min cmd /c "cd frontend && npm run dev"
goto end

:stop
echo Stopping processes running on ports 8000 and 5173...
taskkill /FI "WINDOWTITLE eq DECKKNOB_BACKEND*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq DECKKNOB_FRONTEND*" /T /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /PID %%a /F >nul 2>&1
echo Done.

:end
ping 127.0.0.1 -n 3 >nul
