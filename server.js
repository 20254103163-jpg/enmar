// server.js — 100% cPanel Phusion Passenger & CloudLinux Next.js Server
if (typeof PhusionPassenger !== "undefined") {
  PhusionPassenger.configure({ autoInstall: false });
}

const http = require("http");
const { parse } = require("url");
const path = require("path");
const fs = require("fs");

process.env.NODE_ENV = "production";
process.chdir(__dirname);

// Log function for cPanel debugging
function logDebug(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  try {
    fs.appendFileSync(path.join(__dirname, "cpanel_debug.log"), line);
  } catch (e) {}
}

logDebug("Starting ENMAR Next.js Server on cPanel...");

// 1. Load .env variables automatically
try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const idx = trimmed.indexOf("=");
        if (idx !== -1) {
          const key = trimmed.substring(0, idx).trim();
          let val = trimmed.substring(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
    logDebug("Successfully loaded .env variables");
  }
} catch (e) {
  logDebug("Error parsing .env file: " + e.message);
}

const next = require("next");
const dev = false;
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

let isReady = false;

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = parse(req.url, true);
    if (!isReady) {
      // If a request arrives before prepare() completes, await prepare
      await app.prepare();
      isReady = true;
    }
    await handle(req, res, parsedUrl);
  } catch (err) {
    logDebug("Request error on " + req.url + ": " + err.message);
    res.statusCode = 500;
    res.end("Internal Server Error: " + (err.message || "Unknown error"));
  }
});

// In cPanel Phusion Passenger, process.env.PORT is either a string (socket path) or number.
const port = process.env.PORT || 3000;

// Start listening immediately so Phusion Passenger detects the server alive without 503 timeout
server.listen(port, () => {
  logDebug("Live HTTP server listening on " + port);
  // Prepare Next.js in background
  app
    .prepare()
    .then(() => {
      isReady = true;
      logDebug("Next.js app prepared successfully and ready for traffic!");
    })
    .catch((err) => {
      logDebug("App prepare error: " + err.message);
    });
});
