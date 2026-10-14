// app/api/admin/materials/batches/route.ts
// উৎপাদন রেকর্ড (Production Batches / Runs) API - তৈরি, তালিকা ও স্টক সমন্বয়

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: সকল উৎপাদন ব্যাচের রেকর্ড এবং পরিসংখ্যান লোড করুন
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const productIdParam = searchParams.get("productId");

    const whereClause: any = {};

    if (productIdParam && !isNaN(parseInt(productIdParam, 10))) {
      whereClause.productId = parseInt(productIdParam, 10);
    }

    if (search) {
      whereClause.OR = [
        { batchNumber: { contains: search } },
        { operatorName: { contains: search } },
        { notes: { contains: search } },
        { product: { name: { contains: search } } },
      ];
    }

    const batches = await prisma.productionBatch.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            discountPrice: true,
            unit: true,
            images: true,
            stockQuantity: true,
            category: {
              select: { id: true, name: true },
            },
          },
        },
        items: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                code: true,
                category: true,
                unit: true,
                unitCost: true,
                currentStock: true,
              },
            },
          },
        },
      },
      orderBy: {
        productionDate: "desc",
      },
    });

    // পরিসংখ্যান ক্যালকুলেশন
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalBatchesCount = batches.length;
    let totalUnitsProduced = 0;
    let totalProductionCost = 0;
    let thisMonthBatchesCount = 0;

    const formattedBatches = batches.map((b) => {
      const qProduced = Number(b.quantityProduced);
      const bTotalCost = Number(b.totalCost || 0);
      const bUnitCost = Number(b.unitCost || 0);

      totalUnitsProduced += qProduced;
      totalProductionCost += bTotalCost;

      if (new Date(b.productionDate) >= firstDayOfMonth) {
        thisMonthBatchesCount++;
      }

      return {
        id: b.id,
        batchNumber: b.batchNumber,
        productId: b.productId,
        productName: b.product?.name || "অজানা পণ্য",
        productSlug: b.product?.slug || "",
        productCategory: b.product?.category?.name || "সাধারণ",
        productImages: b.product?.images,
        productSellingPrice: Number(b.product?.discountPrice || b.product?.price || 0),
        productStock: b.product?.stockQuantity || 0,
        quantityProduced: qProduced,
        unit: b.unit || b.product?.unit || "piece",
        productionDate: b.productionDate.toISOString(),
        unitCost: bUnitCost,
        totalCost: bTotalCost,
        operatorName: b.operatorName,
        notes: b.notes,
        deductedStock: b.deductedStock,
        addedToStock: b.addedToStock,
        createdAt: b.createdAt.toISOString(),
        itemsCount: b.items.length,
        items: b.items.map((item) => ({
          id: item.id,
          materialId: item.materialId,
          materialName: item.material?.name || "অজানা উপাদান",
          materialCode: item.material?.code,
          materialCategory: item.material?.category,
          quantityUsed: Number(item.quantityUsed),
          unit: item.unit || item.material?.unit || "kg",
          unitCost: Number(item.unitCost),
          totalCost: Number(item.totalCost),
          currentMaterialStock: Number(item.material?.currentStock || 0),
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedBatches,
      stats: {
        totalBatchesCount,
        totalUnitsProduced,
        totalProductionCost: Math.round(totalProductionCost * 100) / 100,
        thisMonthBatchesCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching production batches:", error);
    return NextResponse.json(
      { success: false, error: "উৎপাদন রেকর্ড লোড করতে সমস্যা হয়েছে: " + error.message },
      { status: 500 }
    );
  }
}

// POST: নতুন উৎপাদন ব্যাচ রেকর্ড সংরক্ষণ করুন এবং স্টক সমন্বয় করুন
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productId,
      batchNumber,
      quantityProduced,
      unit,
      productionDate,
      operatorName,
      notes,
      deductedStock = true,
      addedToStock = true,
      items, // [{ materialId: number, quantityUsed: number, unit?: string, unitCost?: number }]
    } = body;

    const numProductId = parseInt(productId, 10);
    const numQtyProduced = parseFloat(quantityProduced);

    if (isNaN(numProductId) || isNaN(numQtyProduced) || numQtyProduced <= 0) {
      return NextResponse.json(
        { success: false, error: "সঠিক প্রোডাক্ট নির্বাচন করুন এবং উৎপাদনের পরিমাণ (Quantity) দিন।" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "উৎপাদনে ব্যবহৃত অন্তত একটি উপাদান বা কাঁচামাল যোগ করতে হবে।" },
        { status: 400 }
      );
    }

    // প্রোডাক্ট চেক
    const product = await prisma.product.findUnique({
      where: { id: numProductId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "নির্বাচিত প্রোডাক্টটি পাওয়া যায়নি।" },
        { status: 404 }
      );
    }

    // ব্যাচ নম্বর জেনারেশন (যদি ইউজার না দেয়)
    let finalBatchNumber = batchNumber?.trim();
    if (!finalBatchNumber) {
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      finalBatchNumber = `PRD-${todayStr}-${randomSuffix}`;
    }

    // ডুপ্লিকেট ব্যাচ নম্বর চেক
    const existingBatch = await prisma.productionBatch.findUnique({
      where: { batchNumber: finalBatchNumber },
    });

    if (existingBatch) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      finalBatchNumber = `${finalBatchNumber}-${randomSuffix}`;
    }

    // কাঁচামালগুলো ভেরিফাই ও খরচ হিসাব
    const materialIds = items.map((i: any) => parseInt(i.materialId, 10)).filter((id: number) => !isNaN(id));
    const dbMaterials = await prisma.rawMaterial.findMany({
      where: { id: { in: materialIds } },
    });
    const materialMap = new Map(dbMaterials.map((m) => [m.id, m]));

    let batchTotalCost = 0;
    const validatedItems: Array<{
      materialId: number;
      quantityUsed: number;
      unit: string;
      unitCost: number;
      totalCost: number;
    }> = [];

    for (const item of items) {
      const matId = parseInt(item.materialId, 10);
      const qtyUsed = parseFloat(item.quantityUsed);

      if (isNaN(matId) || isNaN(qtyUsed) || qtyUsed <= 0) {
        continue;
      }

      const mat = materialMap.get(matId);
      if (!mat) continue;

      const unitCost =
        item.unitCost !== undefined && !isNaN(parseFloat(item.unitCost))
          ? parseFloat(item.unitCost)
          : Number(mat.unitCost || 0);

      const totalItemCost = qtyUsed * unitCost;
      batchTotalCost += totalItemCost;

      validatedItems.push({
        materialId: matId,
        quantityUsed: qtyUsed,
        unit: item.unit?.trim() || mat.unit || "kg",
        unitCost,
        totalCost: Math.round(totalItemCost * 100) / 100,
      });
    }

    if (validatedItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "উৎপাদনে ব্যবহৃত কাঁচামালের সঠিক পরিমাণ পাওয়া যায়নি।" },
        { status: 400 }
      );
    }

    const batchUnitCost = numQtyProduced > 0 ? batchTotalCost / numQtyProduced : 0;
    const pDate = productionDate ? new Date(productionDate) : new Date();

    // ট্রানজ্যাকশনে ব্যাচ তৈরি ও স্টক সমন্বয়
    const result = await prisma.$transaction(async (tx) => {
      // ১. উৎপাদন ব্যাচ তৈরি
      const createdBatch = await tx.productionBatch.create({
        data: {
          batchNumber: finalBatchNumber,
          productId: numProductId,
          quantityProduced: numQtyProduced,
          unit: unit?.trim() || product.unit || "piece",
          productionDate: pDate,
          unitCost: Math.round(batchUnitCost * 100) / 100,
          totalCost: Math.round(batchTotalCost * 100) / 100,
          operatorName: operatorName?.trim() || null,
          notes: notes?.trim() || null,
          deductedStock: Boolean(deductedStock),
          addedToStock: Boolean(addedToStock),
          items: {
            create: validatedItems.map((vi) => ({
              materialId: vi.materialId,
              quantityUsed: vi.quantityUsed,
              unit: vi.unit,
              unitCost: vi.unitCost,
              totalCost: vi.totalCost,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // ২. কাঁচামাল স্টক বিয়োগ (যদি deductedStock চালু থাকে)
      if (deductedStock) {
        for (const vi of validatedItems) {
          const currentMat = materialMap.get(vi.materialId);
          if (currentMat) {
            const newStock = Math.max(0, Number(currentMat.currentStock) - vi.quantityUsed);
            await tx.rawMaterial.update({
              where: { id: vi.materialId },
              data: {
                currentStock: newStock,
              },
            });
          }
        }
      }

      // ৩. তৈরি হওয়া পরিমাণ প্রোডাক্ট স্টকে যোগ (যদি addedToStock চালু থাকে)
      if (addedToStock) {
        const addCount = Math.round(numQtyProduced);
        await tx.product.update({
          where: { id: numProductId },
          data: {
            stockQuantity: {
              increment: addCount,
            },
          },
        });
      }

      return createdBatch;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `উৎপাদন রেকর্ড সফলভাবে সেভ হয়েছে! (ব্যাচ নং: ${finalBatchNumber})`,
    });
  } catch (error: any) {
    console.error("Error creating production batch:", error);
    return NextResponse.json(
      { success: false, error: "উৎপাদন ব্যাচ সংরক্ষণ করতে ব্যর্থ: " + error.message },
      { status: 500 }
    );
  }
}

// DELETE: ব্যাচ রেকর্ড ডিলিট এবং প্রয়োজন অনুযায়ী স্টক রিভার্স / রোলব্যাক
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    const rollbackStock = searchParams.get("rollback") !== "false"; // default true

    if (!idParam || isNaN(parseInt(idParam, 10))) {
      return NextResponse.json(
        { success: false, error: "সঠিক ব্যাচ আইডি আবশ্যক।" },
        { status: 400 }
      );
    }

    const batchId = parseInt(idParam, 10);

    const batch = await prisma.productionBatch.findUnique({
      where: { id: batchId },
      include: {
        items: true,
      },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: "উৎপাদন রেকর্ডটি পাওয়া যায়নি।" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // ১. যদি স্টক রোলব্যাক করতে চায়
      if (rollbackStock) {
        // কাঁচামাল স্টকে ফেরত দেওয়া (যদি পূর্বে কাটা হয়ে থাকে)
        if (batch.deductedStock) {
          for (const item of batch.items) {
            await tx.rawMaterial.update({
              where: { id: item.materialId },
              data: {
                currentStock: {
                  increment: Number(item.quantityUsed),
                },
              },
            });
          }
        }

        // প্রোডাক্ট স্টক থেকে বিয়োগ করা (যদি পূর্বে যোগ হয়ে থাকে)
        if (batch.addedToStock) {
          const deductCount = Math.round(Number(batch.quantityProduced));
          await tx.product.update({
            where: { id: batch.productId },
            data: {
              stockQuantity: {
                decrement: deductCount,
              },
            },
          });
        }
      }

      // ২. ব্যাচ ও এর আইটেমস ডিলিট (Cascade)
      await tx.productionBatch.delete({
        where: { id: batchId },
      });
    });

    return NextResponse.json({
      success: true,
      message: "উৎপাদন রেকর্ড সফলভাবে মুছে ফেলা হয়েছে এবং স্টক পূর্বাবস্থায় ফিরিয়ে নেওয়া হয়েছে।",
    });
  } catch (error: any) {
    console.error("Error deleting production batch:", error);
    return NextResponse.json(
      { success: false, error: "উৎপাদন রেকর্ড ডিলিট করতে সমস্যা হয়েছে: " + error.message },
      { status: 500 }
    );
  }
}
