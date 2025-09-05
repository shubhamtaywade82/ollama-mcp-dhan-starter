import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import Ajv from "ajv";
import fs from "fs";
import fetch from "node-fetch";
import { cfg } from "../util/env.js";

const PLAN_SCHEMA = JSON.parse(
  fs.readFileSync("schema/plan.schema.json", "utf8")
);
const ajv = new (Ajv as any)({ allErrors: true });

const SYSTEM = fs.readFileSync("prompts/system.txt", "utf8");
const USER = fs.readFileSync("prompts/example_user.txt", "utf8");

// 1) connect to MCP (spawns server as a child process)
const client = new Client({ name: "agent-host", version: "0.1.0" });
await client.connect(
  new StdioClientTransport({ command: "node", args: ["dist/mcp/server.js"] })
);

// 2) Create a simple prompt that asks for direct JSON output
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

If conditions are not met, return: {"intent": "noop", "explanation": "reason"}

Output ONLY the JSON object, no other text.`;

// 3) Simple single request approach
let messages: any[] = [
  { role: "system", content: simplePrompt },
  { role: "user", content: USER },
];

const MAX_STEPS = 8;

for (let step = 0; step < MAX_STEPS; step++) {
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

  // Parse streaming response - collect all content from all chunks
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

  console.log("Step", step + 1, "Response:", fullContent);

  // Try to parse JSON from the content
  try {
    const plan = JSON.parse(fullContent);
    const valid = ajv.validate(PLAN_SCHEMA, plan);
    if (!valid) {
      console.error("Schema validation errors:", ajv.errors);
      // Ask model to fix the format
      messages.push({
        role: "user",
        content: "Return ONLY the final plan JSON object as per schema.",
      });
      continue;
    }
    console.log("FINAL PLAN JSON:\n", JSON.stringify(plan, null, 2));

    // Safety Guards - Prevent execution if not enabled
    if (!cfg.EXECUTE_ORDERS) {
      console.log(
        "\n🚨 SAFETY GUARD: EXECUTE_ORDERS=false - No orders will be placed"
      );
      console.log("To enable order execution, set EXECUTE_ORDERS=true in .env");
    }

    if (cfg.PAPER_MODE) {
      console.log("📄 PAPER_MODE: true - Running in paper trading mode");
      console.log("To enable live trading, set PAPER_MODE=false in .env");
    }

    console.log(
      "\n✅ Plan generated successfully! Agent will continue running..."
    );
    // Remove process.exit(0) to keep the agent running
  } catch {
    // Ask model to return JSON only
    messages.push({
      role: "user",
      content: "Return ONLY the final plan JSON object as valid JSON.",
    });
  }
}

console.error("Max steps reached without a valid plan.");
process.exit(2);
