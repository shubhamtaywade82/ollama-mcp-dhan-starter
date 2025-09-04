import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { cfg } from "../util/env.js";
import { DhanClient } from "../dhan/client.js";
import { MasterLookup } from "../master/master_lookup.js";

const server = new McpServer({ name: "dhan-mcp", version: "0.1.0" });
const client = new DhanClient();
const lookup = new MasterLookup(cfg.MASTER_CSV);

// ---- Tools ----

server.tool(
  "get_funds",
  {
    description: "Available trading funds",
    inputSchema: z.object({}).strict(),
  },
  async () => {
    const data = await client.funds();
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }
);

server.tool(
  "get_positions",
  {
    description: "Open positions",
    inputSchema: z.object({}).strict(),
  },
  async () => {
    const data = await client.positions();
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }
);

server.tool(
  "get_orders",
  {
    description: "Order book",
    inputSchema: z.object({}).strict(),
  },
  async () => {
    const data = await client.orders();
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }
);

server.tool(
  "get_spot",
  {
    description: "Get spot price for underlying",
    inputSchema: z
      .object({ underlying: z.enum(["NIFTY", "BANKNIFTY", "FINNIFTY"]) })
      .strict(),
  },
  async ({ input }) => {
    const data = await client.spot(input.underlying);
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }
);

server.tool(
  "get_quote",
  {
    description: "Quote for a securityId",
    inputSchema: z.object({ securityId: z.number() }).strict(),
  },
  async ({ input }) => {
    const data = await client.quote(input.securityId);
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }
);

server.tool(
  "get_option_chain",
  {
    description: "Option chain for an underlying/expiry",
    inputSchema: z
      .object({
        underlying: z.enum(["NIFTY", "BANKNIFTY", "FINNIFTY"]),
        expiry: z.string(),
      })
      .strict(),
  },
  async ({ input }) => {
    const data = await client.optionChain(input.underlying, input.expiry);
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }
);

server.tool(
  "resolve_instrument",
  {
    description: "Resolve instrument via Master Script CSV",
    inputSchema: z
      .object({
        underlying: z.enum(["NIFTY", "BANKNIFTY", "FINNIFTY"]),
        expiry_kind: z.enum(["current_week", "next_week", "monthly"]),
        option_type: z.enum(["CE", "PE"]),
        strike_selector: z.object({
          mode: z.enum(["ATM", "OTM", "ITM", "ABSOLUTE", "DELTA"]),
          value: z.number().optional(),
        }),
        spot: z.number().optional(),
      })
      .strict(),
  },
  async ({ input }) => {
    const row = lookup.resolve({
      underlying: input.underlying,
      expiry_kind: input.expiry_kind,
      option_type: input.option_type,
      strike_selector: input.strike_selector,
      spot: input.spot,
    });
    return { content: [{ type: "text", text: JSON.stringify(row) }] };
  }
);

server.tool(
  "place_bracket_order",
  {
    description: "Place bracket order",
    inputSchema: z
      .object({
        securityId: z.number(),
        qty: z.number(),
        sl_pct: z.number(),
        tp_pct: z.number(),
      })
      .strict(),
  },
  async ({ input }) => {
    const res = await client.placeBracketOrder(input);
    return { content: [{ type: "text", text: JSON.stringify(res) }] };
  }
);

server.tool(
  "modify_order",
  {
    description: "Modify order (e.g., trail SL)",
    inputSchema: z
      .object({ orderId: z.string(), params: z.record(z.any()) })
      .strict(),
  },
  async ({ input }) => {
    const res = await client.modifyOrder(input);
    return { content: [{ type: "text", text: JSON.stringify(res) }] };
  }
);

server.tool(
  "cancel_order",
  {
    description: "Cancel order",
    inputSchema: z.object({ orderId: z.string() }).strict(),
  },
  async ({ input }) => {
    const res = await client.cancelOrder(input);
    return { content: [{ type: "text", text: JSON.stringify(res) }] };
  }
);

// ---- Resource: LTP snapshot (simple) ----
server.resource(
  "ltp",
  new ResourceTemplate("ltp://:securityId", {
    list: undefined,
    complete: {},
  }),
  {
    description: "Read one LTP snapshot for a securityId",
  },
  async (uri, variables) => {
    const sid = Number(variables.securityId);
    const q = await client.quote(sid);
    return { contents: [{ uri: `ltp://${sid}`, text: JSON.stringify(q) }] };
  }
);

// Start server over stdio
const transport = new StdioServerTransport();
server.connect(transport);
