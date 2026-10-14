// app/api/admin/materials/purchases/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      materialId,
      purchaseDate,
      quantity,
      unitPrice,
      totalCost,
      supplierName,
      invoiceNumber,
      batchNumber,
      notes,
    } = body;

    const numMaterialId = parseInt(materialId, 10);
    const numQty = parseFloat(quantity);
    let numUnitPrice = parseFloat(unitPrice);
    let numTotalCost = parseFloat(totalCost);

    if (isNaN(numMaterialId) || isNaN(numQty) || numQty <= 0) {
      return NextResponse.json(
        { success: false, error: "সঠিক কাঁচামাল এবং ক্রয়ের পরিমাণ (Quantity) আবশ্যক।" },
        { status: 400 }
      );
    }

    if (isNaN(numTotalCost) && !isNaN(numUnitPrice)) {
      numTotalCost = numQty * numUnitPrice;
    } else if (isNaN(numUnitPrice) && !isNaN(numTotalCost)) {
      numUnitPrice = numTotalCost / numQty;
    }

    if (isNaN(numTotalCost) || numTotalCost < 0) {
      numTotalCost = 0;
    }
    if (isNaN(numUnitPrice) || numUnitPrice < 0) {
      numUnitPrice = 0;
    }

    const material = await prisma.rawMaterial.findUnique({
      where: { id: numMaterialId },
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: "কাঁচামালটি খুঁজে পাওয়া যায়নি।" },
        { status: 404 }
      );
    }

    const dateVal = purchaseDate ? new Date(purchaseDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Purchase record
      const purchase = await tx.materialPurchase.create({
        data: {
          materialId: numMaterialId,
          purchaseDate: dateVal,
          quantity: numQty,
          unitPrice: numUnitPrice,
          totalCost: numTotalCost,
          supplierName: supplierName?.trim() || material.supplier || null,
          invoiceNumber: invoiceNumber?.trim() || null,
          batchNumber: batchNumber?.trim() || null,
          notes: notes?.trim() || null,
        },
      });

      // 2. Increment stock and total spent
      const newStock = Number(material.currentStock) + numQty;
      const newTotalPurchased = Number(material.totalPurchased) + numQty;
      const newTotalSpent = Number(material.totalSpent) + numTotalCost;
      const latestUnitCost = numUnitPrice > 0 ? numUnitPrice : Number(material.unitCost);

      const updatedMaterial = await tx.rawMaterial.update({
        where: { id: numMaterialId },
        data: {
          currentStock: newStock,
          totalPurchased: newTotalPurchased,
          totalSpent: newTotalSpent,
          unitCost: latestUnitCost,
          ...(supplierName && { supplier: supplierName.trim() }),
        },
      });

      return { purchase, updatedMaterial };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "ক্রয় ভাউচার সফলভাবে যোগ করা হয়েছে এবং স্টক আপডেট হয়েছে।",
    });
  } catch (error: any) {
    console.error("Error logging purchase:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to log purchase" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const purchaseId = parseInt(id || "", 10);

    if (isNaN(purchaseId)) {
      return NextResponse.json(
        { success: false, error: "সঠিক ভাউচার আইডি প্রদান করুন।" },
        { status: 400 }
      );
    }

    const purchase = await prisma.materialPurchase.findUnique({
      where: { id: purchaseId },
      include: { material: true },
    });

    if (!purchase) {
      return NextResponse.json(
        { success: false, error: "ভাউচারটি পাওয়া যায়নি।" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Deduct from material
      const newStock = Math.max(0, Number(purchase.material.currentStock) - Number(purchase.quantity));
      const newTotalPurchased = Math.max(0, Number(purchase.material.totalPurchased) - Number(purchase.quantity));
      const newTotalSpent = Math.max(0, Number(purchase.material.totalSpent) - Number(purchase.totalCost));

      await tx.rawMaterial.update({
        where: { id: purchase.materialId },
        data: {
          currentStock: newStock,
          totalPurchased: newTotalPurchased,
          totalSpent: newTotalSpent,
        },
      });

      await tx.materialPurchase.delete({
        where: { id: purchaseId },
      });
    });

    return NextResponse.json({
      success: true,
      message: "ক্রয় রেকর্ড সফলভাবে মুছে ফেলা হয়েছে এবং স্টক সমন্বয় করা হয়েছে।",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
