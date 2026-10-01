// scripts/postinstall.js - Safe Postinstall Runner for cPanel
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

try {
  // Check potential locations for schema.prisma
  const locations = [
    path.join(__dirname, '..', 'prisma', 'schema.prisma'),
    path.join(process.cwd(), 'prisma', 'schema.prisma'),
    path.join(process.cwd(), 'schema.prisma'),
  ];

  let schemaPath = null;
  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      schemaPath = loc;
      break;
    }
  }

  if (schemaPath) {
    console.log('[ENMAR] Generating Prisma Client using schema at:', schemaPath);
    execSync(`npx prisma generate --schema="${schemaPath}"`, { stdio: 'inherit' });
    console.log('[ENMAR] Prisma Client generated successfully.');
  } else {
    console.log('[ENMAR] No schema.prisma found in immediate path during postinstall. Skipping gracefully.');
  }
} catch (error) {
  console.warn('[ENMAR] Prisma generate postinstall warning:', error.message);
  // Do not throw or exit with error so cPanel npm install completes cleanly
}
process.exit(0);
