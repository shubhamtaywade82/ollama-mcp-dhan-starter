#!/usr/bin/env node

import express from "express";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";
import Ajv from "ajv";
import { cfg } from "../util/env.js";
import { MasterLookup } from "../master/master_lookup.js";

// Load the plan schema
import { readFileSync } from "fs";
const PLAN_SCHEMA = JSON.parse(
  readFileSync("./schema/plan.schema.json", "utf8")
);

const app = express();
const PORT = process.env.AGENT_PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Initialize components
const ajv = new (Ajv as any)({ allErrors: true });
const masterLookup = new MasterLookup(cfg.MASTER_CSV);

// MCP Client setup
let mcpClient: McpClient | null = null;

async function initializeMcpClient() {
  try {
    const transport = new StdioClientTransport({
      command: "node",
      args: ["dist/mcp/server.js"],
    });

    mcpClient = new McpClient(
      {
        name: "dhan-agent",
        version: "1.0.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    await mcpClient.connect(transport);
    console.log("✅ MCP Client connected");
  } catch (error) {
    console.error("❌ Failed to connect to MCP server:", error);
  }
}

// Signal processing function
async function processSignal(signal: string): Promise<any> {
  if (!mcpClient) {
    throw new Error("MCP client not initialized");
  }

  const simplePrompt = `You are an intraday options-buying assistant for Indian indices (NIFTY, BANKNIFTY, FINNIFTY).

Based on the signal provided, generate a trading plan as a JSON object with the following structure:
{
  "intent": "enter",
  "underlying": "NIFTY",
  "direction": "CE",
  "expiry_kind": "next_week",
  "strike_selector": {"mode": "ATM"},
  "filters": {"liquidity": "strict", "min_oi": 200000, "max_iv_percentile": 80},
  "risk": {"allocation_pct": 0.3, "sl_pct": 0.3, "tp_pct": 0.6, "trail_tick": 2.0, "breakeven_after_gain_pct": 0.15},
  "explanation": "Brief explanation of the trade rationale"
}

If conditions are not met, return: {
  "intent": "noop",
  "underlying": "NIFTY",
  "direction": null,
  "expiry_kind": "next_week",
  "strike_selector": {"mode": "ATM"},
  "filters": {"liquidity": "normal", "min_oi": 0, "max_iv_percentile": 100},
  "risk": {"allocation_pct": 0, "sl_pct": 0, "tp_pct": 0},
  "explanation": "reason"
}

CRITICAL SCHEMA REQUIREMENTS - FOLLOW EXACTLY:
- strike_selector.mode MUST be exactly one of: "ATM", "OTM", "ITM", "ABSOLUTE", "DELTA"
- NEVER use "ATM±1", "ATM+1", "ATM-1", "ATM±2" - these are INVALID and will cause errors
- For ATM strikes, use: {"mode": "ATM"}
- For ATM with ±1 offset, use: {"mode": "ATM", "value": 1}
- For OTM with 2 steps, use: {"mode": "OTM", "value": 2}
- strike_selector can ONLY have "mode" and "value" properties - NO other properties

Output ONLY the JSON object, no other text.`;

  const messages = [
    { role: "system", content: simplePrompt },
    { role: "user", content: signal },
  ];

  const res = await fetch(cfg.OLLAMA_URL + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: cfg.LLM_MODEL,
      format: "json",
      temperature: 0.2,
      messages,
    }),
  });

  const responseText = await res.text();
  let fullContent = "";
  const lines = responseText.trim().split("\n");

  for (const line of lines) {
    try {
      const chunk = JSON.parse(line);
      if (chunk.message && chunk.message.content) {
        fullContent += chunk.message.content;
      }
    } catch (e) {
      // Skip invalid JSON lines
    }
  }

  const plan = JSON.parse(fullContent);
  const valid = ajv.validate(PLAN_SCHEMA, plan);

  if (!valid) {
    throw new Error(`Schema validation failed: ${JSON.stringify(ajv.errors)}`);
  }

  return plan;
}

// Routes
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Agent server running",
    mcp_connected: mcpClient !== null,
    safety_guards: {
      execute_orders: cfg.EXECUTE_ORDERS,
      paper_mode: cfg.PAPER_MODE,
    },
  });
});

app.post("/signal", async (req, res) => {
  try {
    const { signal, timestamp } = req.body;

    if (!signal) {
      return res.status(400).json({
        error: "Signal is required",
        received: req.body,
      });
    }

    console.log(`\n📡 Received signal at ${new Date().toISOString()}:`);
    console.log(`Signal: ${signal}`);

    // Process the signal
    const plan = await processSignal(signal);

    console.log("✅ Generated plan:", JSON.stringify(plan, null, 2));

    // Safety guards
    const safetyInfo = {
      execute_orders: cfg.EXECUTE_ORDERS,
      paper_mode: cfg.PAPER_MODE,
      warnings: [] as string[],
    };

    if (!cfg.EXECUTE_ORDERS) {
      safetyInfo.warnings.push(
        "EXECUTE_ORDERS=false - No orders will be placed"
      );
    }

    if (cfg.PAPER_MODE) {
      safetyInfo.warnings.push(
        "PAPER_MODE=true - Running in paper trading mode"
      );
    }

    // If plan is to enter a trade, resolve the instrument
    let instrument = null;
    if (
      plan.intent === "enter" &&
      plan.underlying &&
      plan.direction &&
      plan.expiry_kind &&
      plan.strike_selector
    ) {
      try {
        instrument = masterLookup.resolve({
          underlying: plan.underlying,
          expiry_kind: plan.expiry_kind,
          option_type: plan.direction,
          strike_selector: plan.strike_selector,
        });
        console.log("🎯 Resolved instrument:", instrument);
      } catch (error) {
        console.warn("⚠️ Failed to resolve instrument:", error);
      }
    }

    res.json({
      success: true,
      plan,
      instrument,
      safety_info: safetyInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error processing signal:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Start server
async function startServer() {
  await initializeMcpClient();

  app.listen(PORT, () => {
    console.log(`🚀 Agent server running on http://localhost:${PORT}`);
    console.log(`📡 Signal endpoint: POST http://localhost:${PORT}/signal`);
    console.log(`❤️ Health check: GET http://localhost:${PORT}/health`);
    console.log(`\n🔒 Safety Guards:`);
    console.log(`   EXECUTE_ORDERS: ${cfg.EXECUTE_ORDERS}`);
    console.log(`   PAPER_MODE: ${cfg.PAPER_MODE}`);
  });
}

startServer().catch(console.error);
