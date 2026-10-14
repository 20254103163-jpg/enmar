// app/api/admin/materials/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const materialId = parseInt(id, 10);
    if (isNaN(materialId)) {
      return NextResponse.json({ error: "Invalid material ID" }, { status: 400 });
    }

    const material = await prisma.rawMaterial.findUnique({
      where: { id: materialId },
      include: {
        purchases: {
          orderBy: { purchaseDate: "desc" },
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
    });

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, material });
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
    const materialId = parseInt(id, 10);
    if (isNaN(materialId)) {
      return NextResponse.json({ error: "Invalid material ID" }, { status: 400 });
    }

    const body = await req.json();
    const {
      name,
      code,
      category,
      unit,
      currentStock,
      unitCost,
      supplier,
      supplierPhone,
      notes,
    } = body;

    const updated = await prisma.rawMaterial.update({
      where: { id: materialId },
      data: {
        ...(name && { name: name.trim() }),
        ...(code !== undefined && { code: code?.trim() || null }),
        ...(category && { category: category.trim() }),
        ...(unit && { unit: unit.trim() }),
        ...(currentStock !== undefined && { currentStock: Math.max(0, parseFloat(currentStock) || 0) }),
        ...(unitCost !== undefined && { unitCost: Math.max(0, parseFloat(unitCost) || 0) }),
        ...(supplier !== undefined && { supplier: supplier?.trim() || null }),
        ...(supplierPhone !== undefined && { supplierPhone: supplierPhone?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
    });

    return NextResponse.json({
      success: true,
      material: updated,
      message: "কাঁচামালের তথ্য সফলভাবে আপডেট হয়েছে।",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const materialId = parseInt(id, 10);
    if (isNaN(materialId)) {
      return NextResponse.json({ error: "Invalid material ID" }, { status: 400 });
    }

    // Delete or soft-delete
    await prisma.rawMaterial.delete({
      where: { id: materialId },
    });

    return NextResponse.json({
      success: true,
      message: "কাঁচামাল সফলভাবে মুছে ফেলা হয়েছে।",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
