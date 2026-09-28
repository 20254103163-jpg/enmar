// app/api/admin/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { serverCache } from "@/lib/serverCache";
import { triggerSnapshotRebuild } from "@/lib/snapshotEngine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = Number(id);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = Number(id);
    const body = await req.json();

    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

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
      isActive,
    } = body;

    let slug = existing.slug;
    if (name && name !== existing.name) {
      let baseSlug = slugify(name);
      slug = baseSlug;
      let counter = 1;
      while (await prisma.product.findFirst({ where: { slug, id: { not: productId } } })) {
        slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}${counter > 1 ? `-${counter}` : ""}`;
        counter++;
      }
    }

    let parsedUnitQty: number | null | undefined = undefined;
    if (unitQuantity !== undefined) {
      parsedUnitQty = unitQuantity !== null && unitQuantity !== "" ? Number(unitQuantity) : null;
    } else if (unit_quantity !== undefined) {
      parsedUnitQty = unit_quantity !== null && unit_quantity !== "" ? Number(unit_quantity) : null;
    }

    const updateData: any = {
      name: name !== undefined ? name : existing.name,
      slug,
      categoryId: categoryId !== undefined ? (categoryId ? Number(categoryId) : null) : existing.categoryId,
      subcategory: subcategory !== undefined ? subcategory : existing.subcategory,
      price: price !== undefined ? Number(price) : existing.price,
      discountPrice: discountPrice !== undefined ? (discountPrice ? Number(discountPrice) : null) : existing.discountPrice,
      stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : existing.stockQuantity,
      unit: unit !== undefined ? unit : existing.unit,
      weightInGrams: body.weightInGrams !== undefined && body.weightInGrams !== null && body.weightInGrams !== "" ? Number(body.weightInGrams) : existing.weightInGrams,
      deliveryDiscountMinQty: body.deliveryDiscountMinQty !== undefined ? (body.deliveryDiscountMinQty !== null && body.deliveryDiscountMinQty !== "" ? Number(body.deliveryDiscountMinQty) : 0) : existing.deliveryDiscountMinQty,
      deliveryDiscountAmount: body.deliveryDiscountAmount !== undefined ? (body.deliveryDiscountAmount !== null && body.deliveryDiscountAmount !== "" ? Number(body.deliveryDiscountAmount) : 0) : existing.deliveryDiscountAmount,
      deliveryDiscountType: body.deliveryDiscountType !== undefined ? body.deliveryDiscountType : existing.deliveryDiscountType,
      deliveryDiscountTiers: body.deliveryDiscountTiers !== undefined ? (Array.isArray(body.deliveryDiscountTiers) ? body.deliveryDiscountTiers : []) : (existing.deliveryDiscountTiers as any),
      images: images !== undefined ? (Array.isArray(images) ? images : []) : (existing.images as any),
      description: description !== undefined ? description : existing.description,
      shortDescription: shortDescription !== undefined ? shortDescription : existing.shortDescription,
      organicCertified: organicCertified !== undefined ? Boolean(organicCertified) : existing.organicCertified,
      isCombo: isCombo !== undefined ? Boolean(isCombo) : existing.isCombo,
      comboProductIds: comboProductIds !== undefined ? comboProductIds : (existing.comboProductIds as any),
      savingsPercentage: savingsPercentage !== undefined ? (savingsPercentage ? Number(savingsPercentage) : null) : existing.savingsPercentage,
      badge: badge !== undefined ? badge : existing.badge,
      featured: featured !== undefined ? Boolean(featured) : existing.featured,
      isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      sourceOrigin: body.sourceOrigin !== undefined ? body.sourceOrigin : existing.sourceOrigin,
      harvestDate: body.harvestDate !== undefined ? body.harvestDate : existing.harvestDate,
      batchNumber: body.batchNumber !== undefined ? body.batchNumber : existing.batchNumber,
      purityCertificateUrl: body.purityCertificateUrl !== undefined ? body.purityCertificateUrl : existing.purityCertificateUrl,
      labTestReportSummary: body.labTestReportSummary !== undefined ? body.labTestReportSummary : existing.labTestReportSummary,
    };

    if (parsedUnitQty !== undefined) {
      updateData.unitQuantity = parsedUnitQty;
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    revalidatePath("/", "layout");
    revalidatePath("/products");
    revalidatePath(`/products/${updated.slug}`);
    serverCache.invalidateAll();
    await triggerSnapshotRebuild().catch(() => {});
    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    console.error("[Product PUT Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = Number(id);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await prisma.$transaction(
      async (tx: any) => {
        // 1. Archive into recycle bin
        await tx.binItem.create({
          data: {
            entityType: "PRODUCT",
            entityId: productId,
            title: product.name,
            subtitle: `৳${product.price} | Stock: ${product.stockQuantity}`,
            payload: product as any,
            deletedBy: "Admin",
          },
        });

        // 2. Unlink foreign keys safely so delete never fails
        await tx.wishlistItem.deleteMany({ where: { productId } });
        await tx.review.deleteMany({ where: { productId } });
        await tx.orderItem.updateMany({
          where: { productId },
          data: { productId: null },
        });

        // 3. Delete product
        await tx.product.delete({ where: { id: productId } });
      },
      { timeout: 15000 }
    );

    revalidatePath("/", "layout");
    revalidatePath("/products");
    revalidatePath(`/products/${product.slug}`);
    serverCache.invalidateAll();
    await triggerSnapshotRebuild().catch(() => {});
    return NextResponse.json({
      success: true,
      message: "Product safely moved to recycle bin and deleted",
    });
  } catch (error: any) {
    console.error("[Product DELETE Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
