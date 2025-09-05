import "dotenv/config";

export const cfg = {
  OLLAMA_URL: process.env.OLLAMA_URL || "http://localhost:11434",
  LLM_MODEL: process.env.LLM_MODEL || "llama3.1:8b-instruct-q5_K_M",
  MODE: (process.env.MODE || "rails") as "rails" | "dhan",
  RAILS_EXECUTOR_URL: process.env.RAILS_EXECUTOR_URL || "http://localhost:3000",
  RAILS_API_KEY: process.env.RAILS_API_KEY || "changeme",
  DHAN_BASE_URL: process.env.DHAN_BASE_URL || "https://api.dhan.co",
  DHAN_ACCESS_TOKEN: process.env.DHAN_ACCESS_TOKEN || "",
  DHAN_WS_URL: process.env.DHAN_WS_URL,
  MASTER_CSV: process.env.MASTER_CSV || "./data/dhan_master_script.csv",
  // Safety Guards
  EXECUTE_ORDERS: process.env.EXECUTE_ORDERS === "true",
  PAPER_MODE: process.env.PAPER_MODE !== "false",
};
