# Ollama + MCP + Dhan Tools Starter (Rails Algo Trader Integration)

A complete local-only trading agent system that integrates with your Rails algo_trader_bot API. This system uses Ollama (local LLM), Model Context Protocol (MCP), and DhanHQ APIs to generate intelligent trading plans from market signals.

## 🚀 What You Get

### **Core Components**
- **MCP Server**: Exposes trading tools and resources via stdio transport
- **Agent Server**: HTTP API server that processes trading signals and generates plans
- **Master Script Resolver**: Real-time instrument resolution using Dhan's master CSV
- **Safety Guards**: Built-in protection against accidental live trading
- **Rails Integration**: Seamless connection to your existing algo_trader_bot API

### **Trading Tools Available**
- `get_funds` - Check available trading capital
- `get_positions` - View current positions
- `get_orders` - List active orders
- `get_spot` - Get underlying spot prices (NIFTY, BANKNIFTY, FINNIFTY)
- `get_quote` - Get real-time quotes for specific instruments
- `get_option_chain` - Fetch option chains for analysis
- `resolve_instrument` - Resolve trading instruments from master script
- `place_bracket_order` - Execute bracket orders with SL/TP
- `modify_order` - Modify existing orders
- `cancel_order` - Cancel pending orders

### **Resources**
- `ltp://:securityId` - Live price snapshots for any security

## 🏗️ Architecture

```
Your Rails Bot → Agent Server → Ollama LLM → MCP Tools → Rails API/Dhan API
                     ↓
              Generated Trading Plan
                     ↓
              Instrument Resolution
                     ↓
              Safety Validation
```

## 📋 Prerequisites

- **Node.js 18+**
- **Ollama** running locally with `llama3.1:8b-instruct-q5_K_M` model
- **Ruby 3.3.4+** (for Rails integration)
- **Your Rails algo_trader_bot** running on `http://localhost:3000`

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
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
RAILS_API_KEY=your_api_key_here

# Safety Guards - DO NOT ENABLE UNTIL READY FOR REAL TRADING
EXECUTE_ORDERS=false
PAPER_MODE=true
```

### 3. Build and Start Services

**Terminal 1 - MCP Server:**
```bash
npm run build
npm run start:mcp
```

**Terminal 2 - Agent Server:**
```bash
npm run start:server
```

**Terminal 3 - Rails Stub (for testing):**
```bash
export PATH="/c/Ruby33-x64/bin:$PATH"
ruby stub_server.rb
```

## 🔌 Rails Integration

### **Signal Processing API**

Send trading signals from your Rails bot to the agent:

```ruby
# In your Rails algo_trader_bot
require 'net/http'
require 'json'

def send_signal(signal_text)
  uri = URI('http://localhost:3001/signal')
  http = Net::HTTP.new(uri.host, uri.port)

  request = Net::HTTP::Post.new(uri)
  request['Content-Type'] = 'application/json'
  request.body = {
    signal: signal_text,
    timestamp: Time.current.iso8601
  }.to_json

  response = http.request(request)
  JSON.parse(response.body)
end

# Example usage
result = send_signal("15m Supertrend flipped bullish on NIFTY; ATR regime=mid; IV%<=70")
if result['success']
  plan = result['plan']
  instrument = result['instrument']
  # Process the trading plan
end
```

### **API Endpoints**

#### **Health Check**
```bash
GET http://localhost:3001/health
```

**Response:**
```json
{
  "status": "ok",
  "message": "Agent server running",
  "mcp_connected": true,
  "safety_guards": {
    "execute_orders": false,
    "paper_mode": true
  }
}
```

#### **Signal Processing**
```bash
POST http://localhost:3001/signal
Content-Type: application/json

{
  "signal": "Your trading signal here"
}
```

**Response:**
```json
{
  "success": true,
  "plan": {
    "intent": "enter",
    "underlying": "NIFTY",
    "direction": "CE",
    "expiry_kind": "next_week",
    "strike_selector": {"mode": "ATM"},
    "filters": {
      "liquidity": "strict",
      "min_oi": 200000,
      "max_iv_percentile": 70
    },
    "risk": {
      "allocation_pct": 0.3,
      "sl_pct": 0.3,
      "tp_pct": 0.6,
      "trail_tick": 2,
      "breakeven_after_gain_pct": 0.15
    },
    "explanation": "Bullish Supertrend signal on NIFTY; ATR regime mid; IV%<=70"
  },
  "instrument": {
    "security_id": 44638,
    "trading_symbol": "NIFTY-Sep2025-24800-CE",
    "underlying_symbol": "NIFTY",
    "expiry": "2025-09-16",
    "strike": 24800,
    "option_type": "CE",
    "lot_size": 75,
    "tick_size": 5
  },
  "safety_info": {
    "execute_orders": false,
    "paper_mode": true,
    "warnings": ["PAPER_MODE=true - Running in paper trading mode"]
  },
  "timestamp": "2025-09-05T02:38:54.579Z"
}
```

## 🛡️ Safety Features

### **Built-in Safety Guards**
- **EXECUTE_ORDERS**: Prevents order execution when `false`
- **PAPER_MODE**: Ensures paper trading when `true`
- **Schema Validation**: All plans must pass strict JSON schema validation
- **Runtime Warnings**: Clear warnings displayed for safety status

### **Production Safety Checklist**
Before enabling live trading:
1. Set `EXECUTE_ORDERS=true` in `.env`
2. Set `PAPER_MODE=false` in `.env`
3. Verify your Rails API is properly configured
4. Test with small position sizes first

## 📊 Trading Plan Schema

The agent generates plans following this schema:

```json
{
  "intent": "enter|exit|modify|cancel|noop",
  "underlying": "NIFTY|BANKNIFTY|FINNIFTY",
  "direction": "CE|PE|null",
  "expiry_kind": "current_week|next_week|monthly",
  "strike_selector": {
    "mode": "ATM|OTM|ITM|ABSOLUTE|DELTA",
    "value": "number (optional)"
  },
  "filters": {
    "liquidity": "normal|strict",
    "min_oi": "number",
    "max_iv_percentile": "number"
  },
  "risk": {
    "allocation_pct": "number",
    "sl_pct": "number",
    "tp_pct": "number",
    "trail_tick": "number|null",
    "breakeven_after_gain_pct": "number|null"
  },
  "explanation": "string"
}
```

## 🔧 Development Scripts

```bash
# Development
npm run dev:mcp          # Start MCP server in dev mode
npm run dev:agent        # Start agent host in dev mode
npm run dev:server       # Start agent server in dev mode

# Production
npm run start:mcp        # Start MCP server
npm run start:agent      # Start agent host
npm run start:server     # Start agent server

# Build
npm run build            # Compile TypeScript
```

## 📁 Project Structure

```
├── src/
│   ├── agent/
│   │   ├── host.ts      # Standalone agent host
│   │   └── server.ts    # HTTP agent server
│   ├── mcp/
│   │   └── server.ts    # MCP server with tools
│   ├── master/
│   │   └── master_lookup.ts  # Instrument resolver
│   ├── dhan/
│   │   ├── client.ts    # Dhan API client
│   │   └── ws.ts        # WebSocket feed
│   └── util/
│       └── env.ts       # Environment configuration
├── schema/
│   └── plan.schema.json # Trading plan validation schema
├── prompts/
│   ├── system.txt       # System prompt for LLM
│   └── example_user.txt # Example user prompt
├── data/
│   └── dhan_master_script.csv  # Real Dhan master script
├── stub_server.rb       # Rails stub for testing
└── Gemfile              # Ruby dependencies
```

## 🧪 Testing

### **Test Signal Processing**
```bash
curl -X POST http://localhost:3001/signal \
  -H "Content-Type: application/json" \
  -d '{"signal": "15m Supertrend flipped bullish on NIFTY; ATR regime=mid; IV%<=70"}'
```

### **Test Health Check**
```bash
curl http://localhost:3001/health
```

### **Test Rails Integration**
```bash
# Start Rails stub server
ruby stub_server.rb

# Test MCP tools
curl -H "X-API-Key: changeme" http://localhost:3000/llm/funds
```

## 🔄 Complete Workflow

1. **Signal Detection**: Your Rails bot detects a trading signal
2. **Signal Processing**: Bot sends signal to agent server via HTTP
3. **LLM Analysis**: Agent processes signal through Ollama LLM
4. **Plan Generation**: LLM generates structured trading plan
5. **Instrument Resolution**: Agent resolves actual trading instruments
6. **Safety Validation**: Plan validated against safety guards
7. **Execution**: Plan sent back to Rails bot for execution

## 🚨 Error Handling

The system includes comprehensive error handling:
- **Schema Validation**: Invalid plans are rejected with detailed errors
- **MCP Connection**: Graceful handling of MCP server disconnections
- **API Failures**: Proper error responses for failed API calls
- **Safety Guards**: Prevents execution when safety conditions not met

## 📈 Performance

- **Response Time**: Typically 2-5 seconds for plan generation
- **Concurrent Requests**: Supports multiple simultaneous signal processing
- **Memory Usage**: ~50-100MB for agent server
- **CPU Usage**: Low when idle, moderate during plan generation

## 🔧 Troubleshooting

### **Common Issues**

1. **"MCP client not initialized"**
   - Ensure MCP server is running: `npm run start:mcp`
   - Check MCP server logs for errors

2. **"Schema validation failed"**
   - Check the generated plan format
   - Verify LLM model is responding correctly

3. **"Failed to resolve instrument"**
   - Ensure master CSV is downloaded and accessible
   - Check underlying symbol and expiry parameters

4. **"Connection refused"**
   - Verify Ollama is running: `ollama list`
   - Check Ollama URL in `.env`

### **Debug Mode**
Enable debug logging by setting `DEBUG=true` in your environment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs for error messages
3. Ensure all prerequisites are met
4. Verify your Rails API is properly configured

---

**Ready to integrate with your Rails algo_trader_bot!** 🚀