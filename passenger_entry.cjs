const path = require("path");
const fs = require("fs");

function log(msg) {
  const line = `${new Date().toISOString()} - [PASSENGER_BRIDGE] ${msg}\n`;
  try {
    fs.appendFileSync(path.join(__dirname, "startup_debug.txt"), line);
  } catch {}
  console.log(msg);
}

log("PASSENGER ENTRY INIT");

// Ensure production defaults in hosting environments that don't use npm start
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.PORT = process.env.PORT || "3000";

const appPath = path.join(__dirname, "dist", "index.cjs");
if (!fs.existsSync(appPath)) {
  log(`Missing build file: ${appPath}`);
  const express = require("express");
  const fallback = express();
  fallback.get("*", (_req, res) => {
    res.status(500).send("<h1>Build not found</h1><p>Run npm run build</p>");
  });
  module.exports = fallback;
} else {
  const mod = require(appPath);
  const app = mod && (mod.default || mod);
  module.exports = app;
  log("App loaded from dist/index.cjs");
}
