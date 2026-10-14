// app/api/admin/materials/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";

    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { supplier: { contains: search } },
      ];
    }

    if (category && category !== "ALL") {
      where.category = category;
    }

    const materials = await prisma.rawMaterial.findMany({
      where,
      include: {
        purchases: {
          orderBy: { purchaseDate: "desc" },
          take: 5,
        },
        productIngredients: {
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
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Compute summary stats
    const totalMaterialsCount = materials.length;
    const totalInvestment = materials.reduce((acc, m) => acc + Number(m.totalSpent || 0), 0);
    const totalStockValuation = materials.reduce(
      (acc, m) => acc + Number(m.currentStock || 0) * Number(m.unitCost || 0),
      0
    );

    return NextResponse.json({
      success: true,
      materials,
      stats: {
        totalMaterialsCount,
        totalInvestment,
        totalStockValuation,
      },
    });
  } catch (error: any) {
    console.error("Error fetching raw materials:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch raw materials" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      code,
      category = "উপাদান",
      unit = "kg",
      currentStock = 0,
      unitCost = 0,
      supplier,
      supplierPhone,
      notes,
      initialPurchaseQuantity,
      initialPurchaseCost,
      initialPurchaseDate,
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { success: false, error: "কাঁচামাল বা উপাদানের নাম আবশ্যক।" },
        { status: 400 }
      );
    }

    const numUnitCost = Math.max(0, parseFloat(String(unitCost)) || 0);
    const numStock = Math.max(0, parseFloat(String(currentStock)) || 0);
    const generatedCode =
      code?.trim() || `RM-${Date.now().toString().slice(-6)}`;

    const newMaterial = await prisma.$transaction(async (tx) => {
      let initTotalSpent = numStock * numUnitCost;
      let initTotalPurchased = numStock;

      if (initialPurchaseCost && Number(initialPurchaseCost) > 0) {
        initTotalSpent = Number(initialPurchaseCost);
      }
      if (initialPurchaseQuantity && Number(initialPurchaseQuantity) > 0) {
        initTotalPurchased = Number(initialPurchaseQuantity);
      }

      const material = await tx.rawMaterial.create({
        data: {
          name: name.trim(),
          code: generatedCode,
          category: category.trim(),
          unit: unit.trim(),
          currentStock: numStock,
          unitCost: numUnitCost,
          totalPurchased: initTotalPurchased,
          totalSpent: initTotalSpent,
          supplier: supplier?.trim() || null,
          supplierPhone: supplierPhone?.trim() || null,
          notes: notes?.trim() || null,
          isActive: true,
        },
      });

      // Optionally record initial purchase log if quantity/cost was supplied
      if (initTotalPurchased > 0 || initTotalSpent > 0) {
        await tx.materialPurchase.create({
          data: {
            materialId: material.id,
            purchaseDate: initialPurchaseDate ? new Date(initialPurchaseDate) : new Date(),
            quantity: initTotalPurchased,
            unitPrice: numUnitCost,
            totalCost: initTotalSpent,
            supplierName: supplier?.trim() || "প্রাথমিক স্টক ওপেনিং",
            invoiceNumber: "OPENING-STOCK",
            notes: "সিস্টেম এন্ট্রি প্রাথমিক কাঁচামাল স্টক",
          },
        });
      }

      return material;
    });

    return NextResponse.json({
      success: true,
      material: newMaterial,
      message: "কাঁচামাল সফলভাবে ডাটাবেজে সংরক্ষণ করা হয়েছে।",
    });
  } catch (error: any) {
    console.error("Error creating raw material:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create raw material" },
      { status: 500 }
    );
  }
}
