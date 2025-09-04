# Ollama + MCP + Dhan Tools Starter (Tailored for Rails Executors)

Local-only starter to run a function-calling LLM (Ollama) against MCP tools that proxy your Rails executors or DhanHQ v2 APIs, plus a Master Script CSV resolver.

## What you get

- **MCP server** exposing tools:
  - `get_funds`, `get_positions`, `get_orders`
  - `get_spot`, `get_quote`, `get_option_chain`
  - `resolve_instrument` (Master Script CSV)
  - `place_bracket_order`, `modify_order`, `cancel_order`
  - Resource: `ltp://:securityId` (ad-hoc snapshot via quote; WS pluggable)
- **Agent host** that:
  - Connects to MCP via stdio (spawns it)
  - Calls local **Ollama** with tool definitions
  - Handles tool-calls loop
  - Validates the final **plan JSON** against `schema/plan.schema.json`
- **Prompts** (system + example_user)
- **Sample Master Script CSV** in `data/`

## Prereqs

- Node 18+
- `ollama` running locally (pull a model, e.g. `llama3.1:8b-instruct-q5_K_M`)
- Your Rails executors (or set `MODE=dhan` to call Dhan directly)

## Quickstart

```bash
# 1) Install deps
npm i

# 2) Copy env and adjust
cp .env.example .env

# 3) Build
npm run build

# 4) (Terminal A) Start MCP server
npm run start:mcp

# 5) (Terminal B) Start agent host (will talk to Ollama + MCP)
npm run start:agent
