@echo off
REM Windows batch script to start both MCP and Agent servers
REM This is for development convenience only - not recommended for production

echo 🚀 Starting Trading System Development Environment...

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    exit /b 1
)

REM Check if Ollama is running
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Warning: Ollama is not running on port 11434
    echo    Please start Ollama first: ollama serve
    echo    Continuing anyway...
)

REM Build the project first
echo 📦 Building project...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    exit /b 1
)

REM Start MCP Server in background
echo 🔧 Starting MCP Server...
start /b "MCP Server" cmd /c "npm run start:mcp"

REM Wait for MCP to initialize
echo ⏳ Waiting for MCP Server to initialize...
timeout /t 3 /nobreak >nul

REM Start Agent Server in background
echo 🤖 Starting Agent Server...
start /b "Agent Server" cmd /c "npm run start:server"

REM Wait for Agent to initialize
echo ⏳ Waiting for Agent Server to initialize...
timeout /t 5 /nobreak >nul

echo.
echo ✅ Trading System Started Successfully!
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🤖 Agent URL: http://localhost:3001
echo ❤️  Health Check: curl http://localhost:3001/health
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 📝 To stop all services: Close this window or press Ctrl+C
echo.

REM Keep script running
echo 🔄 Services are running... Press Ctrl+C to stop all services
pause
