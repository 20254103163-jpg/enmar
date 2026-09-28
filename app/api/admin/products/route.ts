// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { serverCache } from "@/lib/serverCache";
import { triggerSnapshotRebuild } from "@/lib/snapshotEngine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");

    const where: any = {};
    if (categoryId && categoryId !== "all") {
      where.categoryId = Number(categoryId);
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error("[Products API GET Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      categoryId,
      subcategory,
      price,
      discountPrice,
      stockQuantity,
      unitQuantity,
      unit_quantity,
      unit,
      images,
      description,
      shortDescription,
      organicCertified,
      isCombo,
      comboProductIds,
      savingsPercentage,
      badge,
      featured,
    } = body;

    if (!name || price === undefined || price === null) {
      return NextResponse.json({ error: "Product name and price are required." }, { status: 400 });
    }

    let baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}${counter > 1 ? `-${counter}` : ""}`;
      counter++;
    }

    const resolvedUnitQty =
      unitQuantity !== undefined && unitQuantity !== null && unitQuantity !== ""
        ? Number(unitQuantity)
        : unit_quantity !== undefined && unit_quantity !== null && unit_quantity !== ""
        ? Number(unit_quantity)
        : null;

    const createData: any = {
      name,
      slug,
      categoryId: categoryId ? Number(categoryId) : null,
      subcategory: subcategory || null,
      price: Number(price),
      discountPrice: discountPrice ? Number(discountPrice) : null,
      stockQuantity: Number(stockQuantity || 0),
      unit: unit || "piece",
      weightInGrams: body.weightInGrams !== undefined && body.weightInGrams !== null && body.weightInGrams !== "" ? Number(body.weightInGrams) : 100,
      deliveryDiscountMinQty: body.deliveryDiscountMinQty !== undefined && body.deliveryDiscountMinQty !== null && body.deliveryDiscountMinQty !== "" ? Number(body.deliveryDiscountMinQty) : 0,
      deliveryDiscountAmount: body.deliveryDiscountAmount !== undefined && body.deliveryDiscountAmount !== null && body.deliveryDiscountAmount !== "" ? Number(body.deliveryDiscountAmount) : 0,
      deliveryDiscountType: body.deliveryDiscountType || "FIXED",
      deliveryDiscountTiers: Array.isArray(body.deliveryDiscountTiers) ? body.deliveryDiscountTiers : undefined,
      images: Array.isArray(images) ? images : [],
      description: description || "",
      shortDescription: shortDescription || null,
      organicCertified: organicCertified !== undefined ? Boolean(organicCertified) : true,
      isCombo: Boolean(isCombo),
      comboProductIds: Array.isArray(comboProductIds) ? comboProductIds : undefined,
      savingsPercentage: savingsPercentage ? Number(savingsPercentage) : null,
      badge: badge || null,
      featured: Boolean(featured),
      isActive: true,
      sourceOrigin: body.sourceOrigin || null,
      harvestDate: body.harvestDate || null,
      batchNumber: body.batchNumber || null,
      purityCertificateUrl: body.purityCertificateUrl || null,
      labTestReportSummary: body.labTestReportSummary || null,
    };

    if (resolvedUnitQty !== null && !isNaN(resolvedUnitQty)) {
      createData.unitQuantity = resolvedUnitQty;
    }

    const product = await prisma.product.create({
      data: createData,
    });

    revalidatePath("/", "layout");
    revalidatePath("/products");
    serverCache.invalidateTag("products");
    serverCache.invalidateTag("home");
    await triggerSnapshotRebuild().catch(() => {});
    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error: any) {
    console.error("[Products API POST Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
