// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

function getSanitizedDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // 1. Strip any accidental wrapping double or single quotes or trailing dots
  url = url.trim().replace(/^["']|["']$/g, "").replace(/\.+$/, "").trim();

  // 2. Safely parse and ensure password special characters (like @ or #) are properly URL-encoded
  try {
    const protocolIndex = url.indexOf("://");
    if (protocolIndex !== -1) {
      const protocol = url.substring(0, protocolIndex);
      const rest = url.substring(protocolIndex + 3);

      const lastAtIndex = rest.lastIndexOf("@");
      if (lastAtIndex !== -1) {
        const credentials = rest.substring(0, lastAtIndex);
        const hostAndPath = rest.substring(lastAtIndex + 1);

        const colonIndex = credentials.indexOf(":");
        if (colonIndex !== -1) {
          const user = credentials.substring(0, colonIndex);
          const rawPassword = credentials.substring(colonIndex + 1);

          const encodedPassword = encodeURIComponent(decodeURIComponent(rawPassword));
          url = `${protocol}://${user}:${encodedPassword}@${hostAndPath}`;
        }
      }
    }

    // 3. TiDB Cloud SSL Handling
    if (url.includes("tidbcloud.com") && !url.includes("sslaccept=") && !url.includes("ssl=")) {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}sslaccept=strict`;
    }

    // 4. Ensure optimal connection pool settings in production/serverless
    if (!url.includes("connection_limit=")) {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}connection_limit=10&pool_timeout=20&connect_timeout=15`;
    }
  } catch (e) {}

  return url;
}

const sanitizedUrl = getSanitizedDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: sanitizedUrl
      ? {
          db: {
            url: sanitizedUrl,
          },
        }
      : undefined,
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

