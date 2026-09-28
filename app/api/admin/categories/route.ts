// app/api/admin/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { serverCache } from "@/lib/serverCache";
import { triggerSnapshotRebuild } from "@/lib/snapshotEngine";

export async function GET() {
  try {
    let categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    // If database was freshly initialized and has no categories, rebuild snapshot to auto-seed
    if (categories.length === 0) {
      await triggerSnapshotRebuild().catch(() => {});
      categories = await prisma.category.findMany({
        include: {
          _count: {
            select: { products: true },
          },
        },
        orderBy: { displayOrder: "asc" },
      });
    }

    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, icon, image, description, displayOrder } = body;

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    let baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.category.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}${counter > 1 ? `-${counter}` : ""}`;
      counter++;
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        icon: icon || "leaf",
        image: image || null,
        description: description || null,
        displayOrder: displayOrder ? Number(displayOrder) : 0,
        isActive: true,
      },
    });

    serverCache.invalidateTag("categories");
    serverCache.invalidateTag("home");
    await triggerSnapshotRebuild().catch(() => {});

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
