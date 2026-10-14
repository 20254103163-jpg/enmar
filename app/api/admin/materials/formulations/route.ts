// app/api/admin/materials/formulations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productIdParam = searchParams.get("productId");

    const where: any = { isActive: true };
    if (productIdParam && !isNaN(Number(productIdParam))) {
      where.id = Number(productIdParam);
    }

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        discountPrice: true,
        unit: true,
        weightInGrams: true,
        stockQuantity: true,
        images: true,
        category: {
          select: { id: true, name: true },
        },
        ingredients: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: true,
                unitCost: true,
                currentStock: true,
                category: true,
              },
            },
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // Format products with total production cost and margin calculations
    const formatted = products.map((prod) => {
      let totalProductionCost = 0;

      const ingredientsList = prod.ingredients.map((ing) => {
        const unitCost = Number(ing.material.unitCost || 0);
        const qtyNeeded = Number(ing.quantityNeeded || 0);
        // Cost per unit of product = quantityNeeded * materialUnitCost
        const lineCost = qtyNeeded * unitCost;
        totalProductionCost += lineCost;

        return {
          id: ing.id,
          materialId: ing.materialId,
          materialName: ing.material.name,
          materialCode: ing.material.code,
          materialUnit: ing.material.unit,
          materialUnitCost: unitCost,
          materialStock: Number(ing.material.currentStock || 0),
          quantityNeeded: qtyNeeded,
          unit: ing.unit,
          cost: Math.round(lineCost * 100) / 100,
          notes: ing.notes,
        };
      });

      const sellingPrice = Number(prod.discountPrice || prod.price || 0);
      const grossProfit = Math.max(0, sellingPrice - totalProductionCost);
      const profitMarginPercent =
        sellingPrice > 0
          ? Math.round(((sellingPrice - totalProductionCost) / sellingPrice) * 1000) / 10
          : 0;

      return {
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        category: prod.category?.name || "General",
        sellingPrice,
        regularPrice: Number(prod.price),
        unit: prod.unit,
        images: prod.images,
        ingredientsCount: ingredientsList.length,
        ingredients: ingredientsList,
        totalProductionCost: Math.round(totalProductionCost * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        profitMarginPercent,
      };
    });

    return NextResponse.json({
      success: true,
      products: formatted,
    });
  } catch (error: any) {
    console.error("Error fetching formulations:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch formulations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, ingredients = [] } = body;

    const numProductId = parseInt(productId, 10);
    if (isNaN(numProductId)) {
      return NextResponse.json(
        { success: false, error: "সঠিক প্রোডাক্ট নির্বাচন করুন।" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: numProductId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "প্রোডাক্টটি পাওয়া যায়নি।" },
        { status: 404 }
      );
    }

    // Fetch materials to get their unit costs
    const materialIds = ingredients.map((i: any) => parseInt(i.materialId, 10)).filter(Boolean);
    const materials = await prisma.rawMaterial.findMany({
      where: { id: { in: materialIds } },
    });

    const materialMap = new Map(materials.map((m) => [m.id, m]));

    await prisma.$transaction(async (tx) => {
      // 1. Clear existing ingredients for this product
      await tx.productIngredient.deleteMany({
        where: { productId: numProductId },
      });

      // 2. Insert new ingredients
      for (const ing of ingredients) {
        const matId = parseInt(ing.materialId, 10);
        const qtyNeeded = parseFloat(ing.quantityNeeded);

        if (!isNaN(matId) && !isNaN(qtyNeeded) && qtyNeeded > 0) {
          const mat = materialMap.get(matId);
          const unitCost = mat ? Number(mat.unitCost || 0) : 0;
          const estimatedCost = qtyNeeded * unitCost;

          await tx.productIngredient.create({
            data: {
              productId: numProductId,
              materialId: matId,
              quantityNeeded: qtyNeeded,
              unit: ing.unit || mat?.unit || "kg",
              estimatedCost,
              notes: ing.notes?.trim() || null,
            },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `"${product.name}" এর জন্য উপাদান ও ফর্মুলেশন সফলভাবে সংরক্ষণ করা হয়েছে।`,
    });
  } catch (error: any) {
    console.error("Error saving formulation:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save formulation" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = parseInt(searchParams.get("productId") || "", 10);
    const materialId = parseInt(searchParams.get("materialId") || "", 10);

    if (isNaN(productId) || isNaN(materialId)) {
      return NextResponse.json(
        { success: false, error: "প্রোডাক্ট আইডি এবং উপাদান আইডি আবশ্যক।" },
        { status: 400 }
      );
    }

    await prisma.productIngredient.deleteMany({
      where: {
        productId,
        materialId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "উপাদানটি প্রোডাক্ট তালিকা থেকে সরানো হয়েছে।",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
