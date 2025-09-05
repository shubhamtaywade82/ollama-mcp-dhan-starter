# WSL Setup Guide for Trading System + Rails App

## 🐧 **Recommended: Run Everything in WSL Ubuntu**

This is the cleanest approach - run both the trading system and your Rails app in WSL.

### **Step 1: Copy Trading System to WSL**

```bash
# From Windows PowerShell/CMD
# Copy the entire repo to WSL
cp -r "C:\Users\shubh\OneDrive\Dhanhq\ollama-mcp-dhan-starter" /home/yourusername/trading-system
```

Or clone directly in WSL:
```bash
# In WSL Ubuntu
cd ~
git clone <your-repo-url> trading-system
cd trading-system
```

### **Step 2: Install Dependencies in WSL**

```bash
# Install Node.js 18+ in WSL
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Ollama in WSL
curl -fsSL https://ollama.com/install.sh | sh

# Install Ruby 3.3.4+ in WSL
sudo apt update
sudo apt install -y ruby ruby-dev build-essential

# Install your Rails app dependencies
cd /path/to/your/rails/app
bundle install
```

### **Step 3: Start Services in WSL**

**Terminal 1 - Trading System:**
```bash
cd ~/trading-system
npm install
npm run build
npm run start:dev
```

**Terminal 2 - Rails App:**
```bash
cd /path/to/your/rails/app
rails server -p 3000
```

**Terminal 3 - Ollama:**
```bash
ollama serve
ollama pull llama3.1:8b-instruct-q5_K_M
```

## 🌐 **Network Access**

- **Trading System**: `http://localhost:3001` (accessible from WSL)
- **Rails App**: `http://localhost:3000` (accessible from WSL)
- **From Windows**: Access via `http://localhost:3001` and `http://localhost:3000`

## 🔧 **WSL-Specific Configuration**

Update your `.env` in WSL:
```env
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
LLM_MODEL=llama3.1:8b-instruct-q5_K_M

# Application Mode
MODE=rails

# Master CSV file path
MASTER_CSV=./data/dhan_master_script.csv

# Rails Executor Configuration
RAILS_EXECUTOR_URL=http://localhost:3000
RAILS_API_KEY=your_rails_api_key_here

# Safety Guards
EXECUTE_ORDERS=false
PAPER_MODE=true
```

## 🧪 **Testing in WSL**

```bash
# Test trading system health
curl http://localhost:3001/health

# Test signal processing
curl -X POST http://localhost:3001/signal \
  -H "Content-Type: application/json" \
  -d '{"signal": "15m Supertrend flipped bullish on NIFTY; ATR regime=mid; IV%<=70"}'

# Test Rails app
curl http://localhost:3000/health
```

## 📁 **File Structure in WSL**

```
/home/yourusername/
├── trading-system/          # This repo
│   ├── src/
│   ├── data/
│   └── start-dev.sh
└── your-rails-app/          # Your Rails app
    ├── app/
    ├── config/
    └── Gemfile
```

## 🚀 **Quick Start Script for WSL**

Create this in your WSL home directory:

```bash
#!/bin/bash
# ~/start-trading-system.sh

echo "🚀 Starting Trading System + Rails App in WSL..."

# Start Ollama
echo "Starting Ollama..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama
sleep 3

# Start Trading System
echo "Starting Trading System..."
cd ~/trading-system
npm run start:dev &
TRADING_PID=$!

# Wait for Trading System
sleep 5

# Start Rails App
echo "Starting Rails App..."
cd ~/your-rails-app
rails server -p 3000 &
RAILS_PID=$!

echo "✅ All services started!"
echo "Trading System: http://localhost:3001"
echo "Rails App: http://localhost:3000"
echo "Ollama: http://localhost:11434"

# Keep running
wait
```

## 🔄 **Alternative: Cross-Platform Setup**

If you prefer to keep the trading system on Windows and Rails in WSL:

### **Windows Side (Trading System)**
- Run on `localhost:3001`
- Accessible from WSL via `localhost:3001`

### **WSL Side (Rails App)**
- Run on `localhost:3000`
- Accessible from Windows via `localhost:3000`

### **Network Configuration**
```bash
# In WSL, test Windows connectivity
curl http://localhost:3001/health

# In Windows, test WSL connectivity
curl http://localhost:3000/health
```

## 🐛 **Troubleshooting WSL Issues**

### **Port Access Issues**
```bash
# Check if ports are accessible
netstat -tlnp | grep :3000
netstat -tlnp | grep :3001
netstat -tlnp | grep :11434
```

### **File Permission Issues**
```bash
# Fix file permissions
chmod +x start-dev.sh
chmod +x start-trading-system.sh
```

### **Node.js Issues**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📝 **Best Practices for WSL**

1. **Use WSL2** for better performance
2. **Store projects in WSL filesystem** (`/home/username/`) not Windows filesystem
3. **Use VS Code with WSL extension** for development
4. **Keep services in separate terminals** for easier debugging
5. **Use `localhost` for inter-service communication**

## 🎯 **Recommended Approach**

**Use Option 1 (Everything in WSL)** because:
- ✅ Cleaner networking
- ✅ Better performance
- ✅ Easier debugging
- ✅ Consistent environment
- ✅ No cross-platform issues
