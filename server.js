// server.js — 100% cPanel Phusion Passenger & CloudLinux Compatible Next.js Server
const { createServer } = require("http");
const { parse } = require("url");
const path = require("path");
const fs = require("fs");
const next = require("next");

process.env.NODE_ENV = "production";
process.chdir(__dirname);

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
    console.log("[ENMAR] Successfully loaded .env variables");
  }
} catch (e) {
  console.error("[ENMAR] Could not parse .env file:", e);
}

// 2. Ensure Prisma Client exists
try {
  const prismaClientDir = path.join(__dirname, "node_modules", ".prisma", "client");
  if (!fs.existsSync(prismaClientDir)) {
    const { execSync } = require("child_process");
    const schemaPath = path.join(__dirname, "prisma", "schema.prisma");
    if (fs.existsSync(schemaPath)) {
      console.log("[ENMAR] Generating Prisma Client at startup...");
      execSync(`npx prisma generate --schema="${schemaPath}"`, { stdio: "inherit" });
    }
  }
} catch (err) {
  console.warn("[ENMAR] Startup Prisma notice:", err.message);
}

const dev = false;
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

// In cPanel Phusion Passenger, process.env.PORT may be a Unix socket path or a port number.
const port = process.env.PORT || 3000;

app.prepare().then(() => {
  createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> [ENMAR] Live Server ready on ${port}`);
  });
}).catch((err) => {
  console.error("[ENMAR] App prepare failed:", err);
});
