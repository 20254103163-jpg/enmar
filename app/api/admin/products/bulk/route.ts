// app/api/admin/products/bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { serverCache } from "@/lib/serverCache";
import { triggerSnapshotRebuild } from "@/lib/snapshotEngine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No product IDs selected." }, { status: 400 });
    }

    const numericIds = ids.map(Number).filter((id) => !isNaN(id));

    if (action === "delete") {
      const products = await prisma.product.findMany({
        where: { id: { in: numericIds } },
      });

      if (products.length === 0) {
        return NextResponse.json({ error: "No matching products found." }, { status: 404 });
      }

      await prisma.$transaction(
        async (tx) => {
          // 1. Archive all selected products to Recycle Bin in a single batch insert
          await tx.binItem.createMany({
            data: products.map((p) => ({
              entityType: "PRODUCT",
              entityId: p.id,
              title: p.name,
              subtitle: `৳${p.price} | Stock: ${p.stockQuantity}`,
              payload: p as any,
              deletedBy: "Admin",
            })),
          });

          // 2. Unlink foreign keys safely
          await tx.wishlistItem.deleteMany({ where: { productId: { in: numericIds } } });
          await tx.review.deleteMany({ where: { productId: { in: numericIds } } });
          await tx.orderItem.updateMany({
            where: { productId: { in: numericIds } },
            data: { productId: null },
          });

          // 3. Delete from Product table
          await tx.product.deleteMany({
            where: { id: { in: numericIds } },
          });
        },
        {
          maxWait: 15000,
          timeout: 30000,
        }
      );

      revalidatePath("/", "layout");
      revalidatePath("/products");
      serverCache.invalidateAll();
      await triggerSnapshotRebuild().catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Successfully moved ${products.length} products to the Recycle Bin.`,
        count: products.length,
      });
    }

    if (action === "update_stock") {
      const stock = Number(body.stock);
      if (isNaN(stock) || stock < 0) {
        return NextResponse.json({ error: "Invalid stock quantity." }, { status: 400 });
      }

      await prisma.product.updateMany({
        where: { id: { in: numericIds } },
        data: { stockQuantity: stock },
      });

      revalidatePath("/", "layout");
      revalidatePath("/products");
      serverCache.invalidateAll();
      await triggerSnapshotRebuild().catch(() => {});
      return NextResponse.json({
        success: true,
        message: `Successfully updated stock to ${stock} for ${numericIds.length} products.`,
      });
    }

    if (action === "update_price") {
      const percentChange = Number(body.percentChange);
      if (isNaN(percentChange)) {
        return NextResponse.json({ error: "Invalid price percentage change." }, { status: 400 });
      }

      const products = await prisma.product.findMany({
        where: { id: { in: numericIds } },
        select: { id: true, price: true },
      });

      await prisma.$transaction(
        products.map((p) => {
          const currentPrice = Number(p.price);
          const newPrice = Math.max(1, Math.round(currentPrice * (1 + percentChange / 100)));
          return prisma.product.update({
            where: { id: p.id },
            data: { price: newPrice },
          });
        })
      );

      revalidatePath("/", "layout");
      revalidatePath("/products");
      serverCache.invalidateAll();
      await triggerSnapshotRebuild().catch(() => {});
      return NextResponse.json({
        success: true,
        message: `Successfully updated prices (${percentChange > 0 ? "+" : ""}${percentChange}%) for ${products.length} products.`,
      });
    }

    if (action === "set_category") {
      const categoryId = Number(body.categoryId);
      if (isNaN(categoryId)) {
        return NextResponse.json({ error: "Invalid category ID." }, { status: 400 });
      }

      await prisma.product.updateMany({
        where: { id: { in: numericIds } },
        data: { categoryId },
      });

      revalidatePath("/", "layout");
      revalidatePath("/products");
      serverCache.invalidateAll();
      await triggerSnapshotRebuild().catch(() => {});
      return NextResponse.json({
        success: true,
        message: `Successfully updated category for ${numericIds.length} products.`,
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("[Bulk Products API Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
