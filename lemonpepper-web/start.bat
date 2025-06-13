@echo off
echo Starting LemonPepper Web...

REM Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Python is required but not installed. Please install Python and try again.
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is required but not installed. Please install Node.js and try again.
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo npm is required but not installed. Please install npm and try again.
    exit /b 1
)

REM Define base directory
set BASE_DIR=%~dp0
set BACKEND_DIR=%BASE_DIR%backend
set FRONTEND_DIR=%BASE_DIR%frontend

REM Check if backend virtual environment exists
if not exist "%BACKEND_DIR%\venv\Scripts\activate.bat" (
    echo Setting up Python virtual environment...
    python -m venv "%BACKEND_DIR%\venv"
    call "%BACKEND_DIR%\venv\Scripts\activate.bat"
    pip install -r "%BACKEND_DIR%\requirements.txt"
) else (
    call "%BACKEND_DIR%\venv\Scripts\activate.bat"
)

REM Check if frontend dependencies are installed
if not exist "%FRONTEND_DIR%\node_modules" (
    echo Installing frontend dependencies...
    cd "%FRONTEND_DIR%" && npm install
)

REM Start backend server in a new window
echo Starting backend server...
start "LemonPepper Backend" cmd /c "cd %BACKEND_DIR% && python app.py"

REM Start frontend development server in a new window
echo Starting frontend server...
start "LemonPepper Frontend" cmd /c "cd %FRONTEND_DIR% && npm start"

echo LemonPepper Web is starting...
echo The application will open in your default browser shortly.
echo Close the command windows to stop the servers.

REM Wait for a moment to ensure servers have time to start
timeout /t 5 /nobreak > nul 