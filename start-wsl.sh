#!/bin/bash

# WSL startup script for Trading System + Rails App
# Run this from WSL Ubuntu

echo "🚀 Starting Trading System + Rails App in WSL..."

# Check if we're in WSL
if [[ ! -f /proc/version ]] || ! grep -q Microsoft /proc/version; then
    echo "⚠️  Warning: This script is designed for WSL. Continuing anyway..."
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        echo "✅ Port $port is available"
        return 0
    else
        echo "❌ Port $port is already in use"
        return 1
    fi
}

# Check required ports
echo "🔍 Checking ports..."
check_port 3000 || { echo "Rails app port 3000 is in use"; exit 1; }
check_port 3001 || { echo "Trading system port 3001 is in use"; exit 1; }
check_port 11434 || { echo "Ollama port 11434 is in use"; exit 1; }

# Start Ollama
echo "🤖 Starting Ollama..."
ollama serve &
OLLAMA_PID=$!
sleep 3

# Check if Ollama is running
if ! kill -0 $OLLAMA_PID 2>/dev/null; then
    echo "❌ Failed to start Ollama"
    exit 1
fi

# Start Trading System
echo "🔧 Starting Trading System..."
cd ~/trading-system || cd ./ollama-mcp-dhan-starter
npm run start:dev &
TRADING_PID=$!
sleep 5

# Check if Trading System is running
if ! kill -0 $TRADING_PID 2>/dev/null; then
    echo "❌ Failed to start Trading System"
    kill $OLLAMA_PID 2>/dev/null
    exit 1
fi

# Start Rails App
echo "🚂 Starting Rails App..."
cd ~/your-rails-app || echo "⚠️  Please update the Rails app path in this script"
rails server -p 3000 &
RAILS_PID=$!
sleep 3

echo ""
echo "✅ All services started successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🤖 Ollama: http://localhost:11434 (PID: $OLLAMA_PID)"
echo "🔧 Trading System: http://localhost:3001 (PID: $TRADING_PID)"
echo "🚂 Rails App: http://localhost:3000 (PID: $RAILS_PID)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 To stop all services: kill $OLLAMA_PID $TRADING_PID $RAILS_PID"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down all services..."
    kill $OLLAMA_PID $TRADING_PID $RAILS_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Monitor services
while true; do
    if ! kill -0 $OLLAMA_PID 2>/dev/null; then
        echo "❌ Ollama stopped unexpectedly"
        cleanup
    fi

    if ! kill -0 $TRADING_PID 2>/dev/null; then
        echo "❌ Trading System stopped unexpectedly"
        cleanup
    fi

    if ! kill -0 $RAILS_PID 2>/dev/null; then
        echo "❌ Rails App stopped unexpectedly"
        cleanup
    fi

    sleep 5
done
