#!/bin/bash

# Working startup script that properly handles MCP servers
# MCP servers are designed to be spawned by other processes, not run standalone

echo "🚀 Starting Trading System Development Environment..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "⚠️  Warning: Ollama is not running on port 11434"
    echo "   Please start Ollama first: ollama serve"
    echo "   Continuing anyway..."
fi

# Build the project first
echo "📦 Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed successfully!"

# Start Agent Server (which will spawn MCP server internally)
echo "🤖 Starting Agent Server (includes MCP server)..."
npm run start:server &
AGENT_PID=$!

# Wait for Agent to initialize
echo "⏳ Waiting for Agent Server to initialize..."
sleep 5

# Check if Agent is running
if ! kill -0 $AGENT_PID 2>/dev/null; then
    echo "❌ Agent Server failed to start"
    exit 1
fi

# Test if Agent is responding
echo "🧪 Testing Agent Server..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Agent Server is responding"
else
    echo "⚠️  Agent Server started but not responding to health checks"
    echo "   This might be normal during initialization..."
fi

echo ""
echo "✅ Trading System Started Successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🤖 Agent Server PID: $AGENT_PID"
echo "🌐 Agent URL: http://localhost:3001"
echo "❤️  Health Check: curl http://localhost:3001/health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 To stop the service: kill $AGENT_PID"
echo ""
echo "🚂 Now start your Rails app in another terminal:"
echo "   rails server -p 3000"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down Agent Server..."
    kill $AGENT_PID 2>/dev/null
    echo "✅ Agent Server stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Monitor Agent Server
echo "🔄 Monitoring Agent Server... (Press Ctrl+C to stop)"
while true; do
    if ! kill -0 $AGENT_PID 2>/dev/null; then
        echo "❌ Agent Server stopped unexpectedly"
        exit 1
    fi

    # Test health every 30 seconds
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Agent Server healthy"
    else
        echo "⚠️  Agent Server not responding to health checks"
    fi

    sleep 30
done
