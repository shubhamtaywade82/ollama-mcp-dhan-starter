// PM2 ecosystem configuration for production
module.exports = {
  apps: [
    {
      name: "mcp-server",
      script: "dist/mcp/server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/mcp-error.log",
      out_file: "./logs/mcp-out.log",
      log_file: "./logs/mcp-combined.log",
      time: true,
    },
    {
      name: "agent-server",
      script: "dist/agent/server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        AGENT_PORT: 3001,
      },
      error_file: "./logs/agent-error.log",
      out_file: "./logs/agent-out.log",
      log_file: "./logs/agent-combined.log",
      time: true,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
