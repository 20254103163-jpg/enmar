// app/api/storefront/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { serverCache } from "@/lib/serverCache";
import { getStorefrontSnapshot } from "@/lib/snapshotEngine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const organicOnly =
      searchParams.get("organicOnly") === "true" ||
      searchParams.get("organic") === "true";
    const inStockOnly =
      searchParams.get("inStockOnly") === "true" ||
      searchParams.get("inStock") === "true";
    const sort = searchParams.get("sort") || "featured";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "24", 10))
    );
    const skip = (page - 1) * limit;

    const cacheKey = `storefront_products_${req.url}`;
    const cachedResponse = serverCache.get<{
      products: any[];
      pagination: any;
    }>(cacheKey);

    if (cachedResponse) {
      return NextResponse.json(
        { success: true, ...cachedResponse },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        }
      );
    }

    // 1. High-Speed Snapshot Engine (0.1ms memory / 0.5ms disk)
    const allProducts = await getStorefrontSnapshot<any[]>("products");
    if (allProducts && Array.isArray(allProducts)) {
      // Deduplicate products strictly by id to guarantee zero duplicate JSON entries
      const productMap = new Map();
      allProducts.forEach((p) => {
        if (p && p.id && !productMap.has(p.id)) {
          productMap.set(p.id, p);
        }
      });
      let filtered = Array.from(productMap.values());

      if (category && category !== "all") {
        const catLower = category.toLowerCase();
        filtered = filtered.filter((p) => {
          if (
            catLower === "combo-bundle-deals" ||
            catLower === "frozen-combo-packs" ||
            catLower === "combo-deals" ||
            catLower.includes("combo")
          ) {
            return (
              p.isCombo ||
              p.category?.slug?.includes("combo") ||
              p.name?.toLowerCase().includes("combo") ||
              p.name?.includes("কম্বো")
            );
          }
          return (
            p.category?.slug === category ||
            String(p.categoryId) === category ||
            p.category?.slug?.toLowerCase() === catLower ||
            p.category?.name?.toLowerCase().includes(catLower)
          );
        });
      }

      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name?.toLowerCase().includes(s) ||
            p.shortDescription?.toLowerCase().includes(s) ||
            p.description?.toLowerCase().includes(s)
        );
      }

      if (minPrice) {
        filtered = filtered.filter((p) => (p.discountPrice || p.price) >= Number(minPrice));
      }
      if (maxPrice) {
        filtered = filtered.filter((p) => (p.discountPrice || p.price) <= Number(maxPrice));
      }
      if (organicOnly) {
        filtered = filtered.filter((p) => p.organicCertified);
      }
      if (inStockOnly) {
        filtered = filtered.filter((p) => (p.stockQuantity || 0) > 0);
      }

      if (sort === "price-asc" || sort === "price_asc") {
        filtered.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
      } else if (sort === "price-desc" || sort === "price_desc") {
        filtered.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
      } else if (sort === "newest") {
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else {
        filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      }

      const total = filtered.length;
      const paginated = filtered.slice(skip, skip + limit);
      const totalPages = Math.ceil(total / limit) || 1;

      const pagination = {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      };

      const result = { products: paginated, pagination };
      serverCache.set(cacheKey, result, 300, ["products"]);

      return NextResponse.json(
        { success: true, ...result },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        }
      );
    }

    // 2. Database Fallback (if snapshot unavailable)
    const where: any = { isActive: true };

    if (category && category !== "all") {
      const catLower = category.toLowerCase();
      if (
        catLower === "combo-bundle-deals" ||
        catLower === "frozen-combo-packs" ||
        catLower === "combo-deals" ||
        catLower.includes("combo")
      ) {
        where.OR = [
          { isCombo: true },
          { category: { slug: { contains: "combo" } } },
          { name: { contains: "কম্বো" } },
        ];
      } else {
        where.category = { slug: category };
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { shortDescription: { contains: search } },
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }

    if (organicOnly) {
      where.organicCertified = true;
    }

    if (inStockOnly) {
      where.stockQuantity = { gt: 0 };
    }

    let orderBy: any = [{ featured: "desc" }, { createdAt: "desc" }];
    if (sort === "price-asc" || sort === "price_asc") orderBy = { price: "asc" };
    if (sort === "price-desc" || sort === "price_desc") orderBy = { price: "desc" };
    if (sort === "newest") orderBy = { createdAt: "desc" };
    if (sort === "featured" || sort === "popular")
      orderBy = [{ featured: "desc" }, { createdAt: "desc" }];

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
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
          shortDescription: true,
          organicCertified: true,
          isCombo: true,
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
            select: { id: true, name: true, slug: true },
          },
        } as any,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const pagination = {
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };

    const responsePayload = {
      products,
      pagination,
    };

    serverCache.set(cacheKey, responsePayload, 60, ["products"]);

    return NextResponse.json(
      { success: true, ...responsePayload },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("[Storefront Products API Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
