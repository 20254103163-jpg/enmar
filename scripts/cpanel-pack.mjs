// scripts/cpanel-pack.mjs - Production cPanel Packager (Terminal-Free Deploy)
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('📦 Preparing ultra-lightweight cPanel deployment bundle for terminal-free hosting...');

try {
  const standaloneDir = path.join(process.cwd(), '.next', 'standalone');
  const standaloneNextDir = path.join(standaloneDir, '.next');
  const staticSrc = path.join(process.cwd(), '.next', 'static');
  const staticDest = path.join(standaloneNextDir, 'static');
  const publicSrc = path.join(process.cwd(), 'public');
  const publicDest = path.join(standaloneDir, 'public');
  const dataSrc = path.join(process.cwd(), 'data');
  const dataDest = path.join(standaloneDir, 'data');
  const prismaSrc = path.join(process.cwd(), 'prisma');
  const prismaDest = path.join(standaloneDir, 'prisma');
  const prismaEnginesSrc = path.join(process.cwd(), 'node_modules', '.prisma');
  const prismaEnginesDest = path.join(standaloneDir, 'node_modules', '.prisma');

  // 1. Copy static and public assets to standalone folder
  console.log('📂 Copying static assets (_next/static)...');
  fs.cpSync(staticSrc, staticDest, { recursive: true });

  console.log('📂 Copying public assets (images, fonts, logo)...');
  fs.cpSync(publicSrc, publicDest, { recursive: true });

  console.log('📂 Copying cache and snapshot data...');
  if (fs.existsSync(dataSrc)) {
    fs.cpSync(dataSrc, dataDest, { recursive: true });
  }

  console.log('📂 Copying prisma schema...');
  if (fs.existsSync(prismaSrc)) {
    fs.cpSync(prismaSrc, prismaDest, { recursive: true });
  }

  // 2. Copy Prisma engines
  console.log('💎 Ensuring Prisma engines are present...');
  if (fs.existsSync(prismaEnginesSrc)) {
    fs.cpSync(prismaEnginesSrc, prismaEnginesDest, { recursive: true });
  }

  // 2.5 Normalize required-server-files.json for Linux path compatibility
  console.log('🐧 Normalizing server manifests for Linux cross-platform compatibility...');
  const reqFilesPath = path.join(standaloneNextDir, 'required-server-files.json');
  if (fs.existsSync(reqFilesPath)) {
    const reqFiles = JSON.parse(fs.readFileSync(reqFilesPath, 'utf8'));
    reqFiles.appDir = '';
    reqFiles.relativeAppDir = '';
    if (reqFiles.config && reqFiles.config.turbopack) {
      reqFiles.config.turbopack.root = '';
    }
    if (Array.isArray(reqFiles.files)) {
      reqFiles.files = reqFiles.files.map((f) => f.replace(/\\/g, '/'));
    }
    if (Array.isArray(reqFiles.ignore)) {
      reqFiles.ignore = reqFiles.ignore.map((f) => f.replace(/\\/g, '/'));
    }
    fs.writeFileSync(reqFilesPath, JSON.stringify(reqFiles, null, 2));
  }

  // 3. Write Phusion Passenger compatible server.js
  console.log('🚀 Generating Phusion Passenger compatible server.js...');
  const serverJsContent = `// server.js - cPanel Phusion Passenger & Node.js Selector Production Server
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
    envContent.split('\\n').forEach((line) => {
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
`;
  fs.writeFileSync(path.join(standaloneDir, 'server.js'), serverJsContent);

  // 4. Create .htaccess for cPanel Apache / Phusion Passenger
  console.log('📄 Generating .htaccess...');
  const htaccessContent = `# DO NOT EDIT: cPanel Node.js Application Routing
PassengerAppType node
PassengerStartupFile server.js

# Static file serving optimization
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Serve Next.js static files directly if present
  RewriteCond %{REQUEST_URI} ^/_next/static/.*$
  RewriteRule ^_next/static/(.*)$ .next/static/$1 [L]

  # Serve public directory assets directly
  RewriteCond %{DOCUMENT_ROOT}/public/$1 -f
  RewriteRule ^(.*)$ public/$1 [L]
</IfModule>
`;
  fs.writeFileSync(path.join(standaloneDir, '.htaccess'), htaccessContent);

  // 5. Copy .env.example
  fs.copyFileSync(
    path.join(process.cwd(), '.env.example'),
    path.join(standaloneDir, '.env.example')
  );

  // 6. Copy main.sql for easy import
  fs.copyFileSync(
    path.join(process.cwd(), 'main.sql'),
    path.join(standaloneDir, 'main.sql')
  );

  // 7. Compress using PowerShell Compress-Archive
  const zipPath = path.join(process.cwd(), 'enmar_cpanel_deploy.zip');
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  console.log('🗜️ Creating enmar_cpanel_deploy.zip (<50MB, Self-Contained)...');
  execSync(`powershell -command "Get-ChildItem -Path '.next\\standalone' -Force | Compress-Archive -DestinationPath 'enmar_cpanel_deploy.zip' -Force"`, { stdio: 'inherit' });

  const stats = fs.statSync(zipPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`\n🎉 SUCCESS! enmar_cpanel_deploy.zip created successfully!`);
  console.log(`📦 File size: ${sizeMB} MB (Ultra-lightweight, 100% self-contained for cPanel without terminal)`);
} catch (error) {
  console.error('❌ Packaging failed:', error.message);
}
