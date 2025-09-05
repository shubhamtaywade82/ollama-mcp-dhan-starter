#!/bin/bash

# Development convenience script to start both MCP and Agent servers
# This is for development convenience only - not recommended for production

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

# Start MCP Server in background
echo "🔧 Starting MCP Server..."
npm run start:mcp &
MCP_PID=$!

# Wait for MCP to initialize
echo "⏳ Waiting for MCP Server to initialize..."
sleep 3

# Check if MCP is running (MCP servers run silently, so we check if process exists)
if ! kill -0 $MCP_PID 2>/dev/null; then
    echo "❌ MCP Server failed to start (PID: $MCP_PID)"
    exit 1
fi

echo "✅ MCP Server started (PID: $MCP_PID)"

# Start Agent Server in background
echo "🤖 Starting Agent Server..."
npm run start:server &
AGENT_PID=$!

# Wait for Agent to initialize
echo "⏳ Waiting for Agent Server to initialize..."
sleep 5

# Check if Agent is running
if ! kill -0 $AGENT_PID 2>/dev/null; then
    echo "❌ Agent Server failed to start"
    kill $MCP_PID 2>/dev/null
    exit 1
fi

echo ""
echo "✅ Trading System Started Successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 MCP Server PID: $MCP_PID"
echo "🤖 Agent Server PID: $AGENT_PID"
echo "🌐 Agent URL: http://localhost:3001"
echo "❤️  Health Check: curl http://localhost:3001/health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 To stop all services:"
echo "   kill $MCP_PID $AGENT_PID"
echo ""
echo "📝 To view logs:"
echo "   tail -f /dev/null &"
echo ""

# Function to handle cleanup on script exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $MCP_PID $AGENT_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep script running and show status
echo "🔄 Services are running... Press Ctrl+C to stop all services"
echo ""

# Monitor services
echo "🔄 Monitoring services... (Press Ctrl+C to stop all)"
while true; do
    # Check MCP Server (runs silently, so just check if process exists)
    if ! kill -0 $MCP_PID 2>/dev/null; then
        echo "❌ MCP Server stopped unexpectedly"
        kill $AGENT_PID 2>/dev/null
        exit 1
    fi

    # Check Agent Server (should be accessible via HTTP)
    if ! kill -0 $AGENT_PID 2>/dev/null; then
        echo "❌ Agent Server stopped unexpectedly"
        kill $MCP_PID 2>/dev/null
        exit 1
    fi

    # Optional: Test Agent Server health
    if command -v curl &> /dev/null; then
        if curl -s http://localhost:3001/health > /dev/null 2>&1; then
            echo "✅ All services healthy"
        else
            echo "⚠️  Agent Server not responding to health checks"
        fi
    fi

    sleep 10
done
