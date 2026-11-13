module.exports = {
  apps: [{
    name: "vibeapp-api",
    script: "server.js",
    cwd: __dirname,
    max_memory_restart: "700M",
    env: { NODE_ENV: "production" },
  }],
};
