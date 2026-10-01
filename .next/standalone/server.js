// server.js - cPanel Phusion Passenger & Node.js Selector Production Server
if (typeof PhusionPassenger !== 'undefined') {
  PhusionPassenger.configure({ autoInstall: false });
}

const http = require('http');
const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'production';
process.chdir(__dirname);

// Load .env automatically without needing external packages
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
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
    console.log('[ENMAR] Loaded environment variables from .env');
  }
} catch (e) {
  console.error('[ENMAR] Error loading .env:', e);
}

// Load Next.js Server
const NextServer = require('next/dist/server/next-server').default;

let nextConfig = {};
try {
  const requiredServerFiles = JSON.parse(
    fs.readFileSync(path.join(__dirname, '.next', 'required-server-files.json'), 'utf8')
  );
  nextConfig = requiredServerFiles.config || {};
} catch (e) {
  console.warn('[ENMAR] Could not read required-server-files.json:', e);
}

const app = new NextServer({
  hostname: '0.0.0.0',
  port: 3000,
  dir: __dirname,
  dev: false,
  customServer: false,
  conf: nextConfig
});

const handler = app.getRequestHandler();

const server = http.createServer(async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    console.error('[ENMAR] Request error:', req.url, err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

// Phusion Passenger in cPanel sets process.env.PORT to a Unix socket or custom port, or listens to 'passenger'
const port = process.env.PORT || (typeof PhusionPassenger !== 'undefined' ? 'passenger' : 3000);
server.listen(port, () => {
  console.log('> [ENMAR] Live Server listening on ' + port);
});
