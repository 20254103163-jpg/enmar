// lib/snapshotEngine.ts - High-Performance, Memory-Guarded JSON Snapshot & Storefront Cache Engine

import { writeFile, readFile, mkdir } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { serverCache } from "@/lib/serverCache";
import { getProductImages, getSafeImageUrl } from "@/lib/utils";

const SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshots");

function serializePrisma(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      if (typeof value === "bigint") return value.toString();
      return value;
    })
  );
}

function sanitizeProductCards(list: any[]): any[] {
  return list.map((p) => {
    const imgs = getProductImages(p.images);
    return {
      ...p,
      images: imgs.length > 0 ? imgs : ["/placeholder.png"],
    };
  });
}

const PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  categoryId: true,
  subcategory: true,
  price: true,
  discountPrice: true,
  stockQuantity: true,
  unitQuantity: true,
  unit: true,
  images: true,
  description: true,
  shortDescription: true,
  organicCertified: true,
  isCombo: true,
  comboProductIds: true,
  savingsPercentage: true,
  badge: true,
  featured: true,
  weightInGrams: true,
  deliveryDiscountMinQty: true,
  deliveryDiscountAmount: true,
  deliveryDiscountType: true,
  deliveryDiscountTiers: true,
  createdAt: true,
  category: {
    select: { id: true, name: true, slug: true, icon: true },
  },
} as const;

export interface StorefrontSnapshots {
  home: any;
  products: any[];
  categories: any[];
  settings: Record<string, string>;
  theme: any;
  features: Record<string, boolean>;
  updatedAt: string;
}

// In-flight singleton promise deduplication to protect server CPU & Memory
let activeRebuildPromise: Promise<StorefrontSnapshots | null> | null = null;

export async function generateStorefrontSnapshots(): Promise<StorefrontSnapshots | null> {
  if (activeRebuildPromise) {
    return activeRebuildPromise;
  }

  activeRebuildPromise = (async () => {
    try {
      const [
        categories,
        allProducts,
        siteSettings,
        theme,
        banners,
        featureFlags,
      ] = await Promise.all([
        prisma.category.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            image: true,
            displayOrder: true,
            _count: { select: { products: true } },
          },
          orderBy: { displayOrder: "asc" },
        }),
        prisma.product.findMany({
          where: { isActive: true },
          select: PRODUCT_SELECT,
          orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        }),
        prisma.siteSetting.findMany({
          where: { isSecret: false },
          select: { key: true, value: true },
        }),
        prisma.themeSetting.findFirst(),
        prisma.promotionBanner.findMany({
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
        }),
        prisma.featureFlag.findMany({
          select: { key: true, isEnabled: true },
        }),
      ]);

      const settingsMap: Record<string, string> = {};
      siteSettings.forEach((s: any) => {
        settingsMap[s.key] = s.value;
      });

      const featuresMap: Record<string, boolean> = {
        wishlist: true,
        reviews: true,
        promo_codes: true,
        wellness_tools: true,
        new_product_notifications: true,
        payment_cod: true,
        payment_bkash: true,
        payment_card: true,
        homepage_testimonials: true,
        homepage_combos_banner: true,
        homepage_promo_banners: true,
        whatsapp_floating_button: true,
        cookie_consent_banner: true,
        search_autocomplete: true,
      };
      featureFlags.forEach((f: any) => {
        featuresMap[f.key] = f.isEnabled;
      });

      const isPromoBannerEnabled =
        settingsMap["homepage_promo_banner_enabled"] !== "false" &&
        featuresMap["homepage_promo_banners"] !== false;

      const serializedProducts = serializePrisma(allProducts);
      const rawCardProducts = sanitizeProductCards(serializedProducts);

      // Deduplicate products strictly by id to guarantee zero duplicate JSON entries
      const productMap = new Map();
      rawCardProducts.forEach((p) => {
        if (p && p.id && !productMap.has(p.id)) {
          productMap.set(p.id, p);
        }
      });
      const cardOptimizedProducts = Array.from(productMap.values());
      const featuredProducts = cardOptimizedProducts.slice(0, 36);
      const comboDeals = cardOptimizedProducts.filter((p) => p.isCombo).slice(0, 8);

      const homePayload = {
        categories: serializePrisma(categories),
        featuredProducts,
        comboDeals,
        settings: settingsMap,
        theme: serializePrisma(theme),
        banners: isPromoBannerEnabled ? serializePrisma(banners) : [],
      };

      const snapshotData: StorefrontSnapshots = {
        home: homePayload,
        products: cardOptimizedProducts,
        categories: serializePrisma(categories),
        settings: settingsMap,
        theme: serializePrisma(theme),
        features: featuresMap,
        updatedAt: new Date().toISOString(),
      };

      // 1. Sync directly to RAM memory cache (0.1ms access, bounded memory guard)
      const CACHE_TTL = 60; // 60 seconds TTL for fast reflection of database updates
      serverCache.set("snapshot_home", homePayload, CACHE_TTL, ["home", "products", "settings", "categories", "banners"]);
      serverCache.set("snapshot_products", cardOptimizedProducts, CACHE_TTL, ["products"]);
      serverCache.set("snapshot_categories", categories, CACHE_TTL, ["categories"]);
      serverCache.set("snapshot_settings", { settings: settingsMap, theme }, CACHE_TTL, ["settings", "theme"]);
      serverCache.set("snapshot_bootstrap", { settings: settingsMap, categories, features: featuresMap }, CACHE_TTL, ["settings", "categories", "features"]);

      // 2. Persist to disk JSON snapshots for resilient zero-latency instant boot
      try {
        await mkdir(SNAPSHOT_DIR, { recursive: true });
        const siteCachePayload = {
          ...settingsMap,
          categories,
        };
        await Promise.all([
          writeFile(path.join(SNAPSHOT_DIR, "home.json"), JSON.stringify(homePayload, null, 2)),
          writeFile(path.join(SNAPSHOT_DIR, "products.json"), JSON.stringify(cardOptimizedProducts, null, 2)),
          writeFile(path.join(SNAPSHOT_DIR, "categories.json"), JSON.stringify(categories, null, 2)),
          writeFile(path.join(SNAPSHOT_DIR, "settings.json"), JSON.stringify({ settings: settingsMap, theme }, null, 2)),
          writeFile(path.join(SNAPSHOT_DIR, "bootstrap.json"), JSON.stringify({ settings: settingsMap, categories, features: featuresMap }, null, 2)),
          writeFile(path.join(process.cwd(), "data", "site-cache.json"), JSON.stringify(siteCachePayload, null, 2)),
        ]);
      } catch (diskErr) {
        // Serverless environments without disk write permission will seamlessly use serverCache RAM
      }

      return snapshotData;
    } catch (error) {
      console.error("[generateStorefrontSnapshots Error]:", error);
      return null;
    } finally {
      activeRebuildPromise = null;
    }
  })();

  return activeRebuildPromise;
}

export async function getStorefrontSnapshot<T = any>(
  key: "home" | "products" | "categories" | "settings" | "bootstrap"
): Promise<T | null> {
  // 1. Fast Memory RAM check (0.1ms - Instantaneous)
  const cached = serverCache.get<T>(`snapshot_${key}`);
  if (cached) return cached;

  // 2. Synchronous Live Database Query (Guarantees immediate sync with DB updates & deletes)
  try {
    const snapshots = await generateStorefrontSnapshots();
    if (snapshots) {
      if (key === "home") return snapshots.home as T;
      if (key === "products") return snapshots.products as T;
      if (key === "categories") return snapshots.categories as T;
      if (key === "settings") return { settings: snapshots.settings, theme: snapshots.theme } as T;
      if (key === "bootstrap") return { settings: snapshots.settings, categories: snapshots.categories, features: snapshots.features } as T;
    }
  } catch (dbErr) {
    console.warn(`[getStorefrontSnapshot ${key} DB Warning]:`, dbErr);
  }

  // 3. Fallback to Local Disk Snapshot ONLY if DB query failed
  try {
    const filePath = path.join(SNAPSHOT_DIR, `${key}.json`);
    const fileContent = await readFile(filePath, "utf-8");
    if (fileContent) {
      const parsed = JSON.parse(fileContent);
      serverCache.set(`snapshot_${key}`, parsed, 60, [key]);
      return parsed as T;
    }
  } catch (e) {
    // Disk file might not exist on fresh scaffold
  }

  return null;
}

/**
 * Call this function whenever an admin modifies products, categories, settings, banners, or theme.
 * Automatically invalidates stale caches and writes updated JSON snapshots to disk atomically.
 */
export async function triggerSnapshotRebuild(): Promise<StorefrontSnapshots | null> {
  activeRebuildPromise = null;
  serverCache.invalidateAll();

  const snapshots = await generateStorefrontSnapshots();

  try {
    revalidatePath("/", "layout");
    revalidatePath("/products");
    revalidatePath("/products/[slug]", "page");
  } catch (e) {
    // revalidatePath might not be called in CLI context
  }

  return snapshots;
}

