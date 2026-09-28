// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine and merge Tailwind class names cleanly
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Bangladeshi Taka (৳)
 */
export function formatTaka(amount: number | string | null | undefined): string {
  const num = Number(amount || 0);
  return `৳${num.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Generate unique human-readable tracking ID for order tracking
 */
export function generateTrackingId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ENM-${token}`;
}

/**
 * Generate human-readable Order Number
 */
export function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomSuffix}`;
}

/**
 * Generate SEO-friendly slug (Supports English, Bengali, and Unicode characters)
 */
export function slugify(text: string): string {
  if (!text) return `item-${Date.now().toString(36)}`;
  let slug = text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\-]/gu, "") // Keep Unicode letters, numbers, and hyphens
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug || slug === "-") {
    slug = `item-${Date.now().toString(36)}`;
  }
  return slug;
}

/**
 * Bulletproof helper to format image URLs from uploads or external CDNs
 */
export function getSafeImageUrl(
  url: any,
  fallback = "/placeholder.png"
): string {
  if (!url) return fallback;

  // Handle JavaScript array of URLs (e.g. from Prisma JSON column)
  if (Array.isArray(url)) {
    if (url.length === 0) return fallback;
    return getSafeImageUrl(url[0], fallback);
  }

  if (typeof url !== "string") return fallback;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "/assets/products/placeholder.jpg") return fallback;

  // Handle data URIs as-is
  if (trimmed.startsWith("data:image/")) return trimmed;

  // Handle accidental stringified JSON array e.g. '["/uploads/..."]'
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return getSafeImageUrl(parsed[0], fallback);
      }
    } catch (e) {}
    return fallback;
  }

  // Handle Windows paths or missing leading slash
  if (trimmed.startsWith("uploads/")) return `/${trimmed}`;
  if (trimmed.startsWith("\\uploads\\")) return trimmed.replace(/\\/g, "/");
  return trimmed;
}

/**
 * Extract image list safely from any product schema field (handles array, JSON string, or single URL)
 */
export function getProductImages(
  rawImages: any,
  fallback = "/placeholder.png"
): string[] {
  if (!rawImages) return [fallback];

  if (Array.isArray(rawImages)) {
    const list = rawImages
      .filter((img) => typeof img === "string" && img.trim().length > 0)
      .map((img) => getSafeImageUrl(img, fallback));
    return list.length > 0 ? list : [fallback];
  }

  if (typeof rawImages === "string") {
    const trimmed = rawImages.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const list = parsed
            .filter((img) => typeof img === "string" && img.trim().length > 0)
            .map((img) => getSafeImageUrl(img, fallback));
          return list.length > 0 ? list : [fallback];
        }
      } catch (e) {}
    }
    return [getSafeImageUrl(trimmed, fallback)];
  }

  return [fallback];
}

/**
 * Format product unit display, combining quantity and unit (e.g. "500 g", "1.5 kg", "2 L", "1 piece")
 */
export function formatProductUnit(
  unitQuantity?: number | string | null,
  unit?: string | null
): string {
  const u = unit?.trim() || "";

  if (unitQuantity !== undefined && unitQuantity !== null && unitQuantity !== "") {
    const qtyNum = Number(unitQuantity);
    if (!isNaN(qtyNum) && qtyNum > 0) {
      // Format number without unnecessary trailing zeros
      const qtyFormatted = Number.isInteger(qtyNum)
        ? qtyNum.toString()
        : parseFloat(qtyNum.toFixed(3)).toString();

      if (!u) return qtyFormatted;

      // If unit already starts with numbers/quantity (e.g., "500g", "1 Litre", "4-in-1 Combo"), return unit directly
      if (/^\d/.test(u)) return u;

      return `${qtyFormatted} ${u}`;
    }
  }

  return u || "piece";
}

/**
 * Convert English digits to standard Bengali numerals (০-৯)
 */
export function formatBengaliNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return "০";
  const str = String(num);
  const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return str.replace(/\d/g, (d) => bengaliDigits[parseInt(d, 10)] || d);
}

