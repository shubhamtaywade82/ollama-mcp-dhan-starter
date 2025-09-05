#!/bin/bash

# Simple startup script that starts services in separate terminals
# This is the recommended approach for development

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

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "🚀 Starting services in separate terminals..."
echo ""
echo "📝 Please run these commands in separate terminals:"
echo ""
echo "Terminal 1 - MCP Server:"
echo "  npm run start:mcp"
echo ""
echo "Terminal 2 - Agent Server:"
echo "  npm run start:server"
echo ""
echo "Terminal 3 - Your Rails App:"
echo "  rails server -p 3000"
echo ""
echo "Terminal 4 - Ollama (if not running):"
echo "  ollama serve"
echo ""
echo "🔗 URLs:"
echo "  Agent Server: http://localhost:3001"
echo "  Rails App: http://localhost:3000"
echo "  Ollama: http://localhost:11434"
echo ""
echo "🧪 Test the setup:"
echo "  curl http://localhost:3001/health"
echo ""
echo "Press any key to continue..."
read -n 1
