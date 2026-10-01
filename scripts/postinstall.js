// scripts/postinstall.js - Safe Prisma Generate for cPanel
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Try to find the project root (where prisma/schema.prisma lives)
function findSchemaPath() {
  const candidates = [
    // Most likely: script is in /app_root/scripts/postinstall.js
    path.join(__dirname, '..', 'prisma', 'schema.prisma'),
    // Fallback: CWD is app root
    path.join(process.cwd(), 'prisma', 'schema.prisma'),
    // Fallback: schema at root level
    path.join(process.cwd(), 'schema.prisma'),
    path.join(__dirname, '..', 'schema.prisma'),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch (e) {}
  }
  return null;
}

try {
  const schemaPath = findSchemaPath();

  if (!schemaPath) {
    console.log('[ENMAR postinstall] No schema.prisma found — skipping prisma generate.');
    process.exit(0);
  }

  console.log('[ENMAR postinstall] Found schema at:', schemaPath);

  // Use --schema flag to avoid any config file confusion
  execSync(`npx prisma generate --schema="${schemaPath}"`, {
    stdio: 'inherit',
    env: { ...process.env },
  });

  console.log('[ENMAR postinstall] Prisma Client generated successfully.');
} catch (error) {
  // Do NOT fail the install — just warn and continue
  console.warn('[ENMAR postinstall] Warning (non-fatal):', error.message);
}

process.exit(0);
