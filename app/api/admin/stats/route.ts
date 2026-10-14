// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filterStatus = searchParams.get("status") || "ACTIVE"; // "ACTIVE" | "DELIVERED" | "ALL"
    const daysParam = searchParams.get("days") || "all"; // "7" | "14" | "30" | "all"

    // 1. Fetch products, stock, pending, and recent orders
    const [
      totalProducts,
      totalOrders,
      lowStockProducts,
      recentOrders,
      pendingOrders,
      productsWithCosts,
      allOrders,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.product.findMany({
        where: { stockQuantity: { lte: 10 } },
        select: { id: true, name: true, stockQuantity: true, price: true, unit: true },
        take: 8,
      }),
      prisma.order.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { items: true },
      }),
      prisma.order.count({
        where: { orderStatus: "PENDING" },
      }),
      prisma.product.findMany({
        select: {
          id: true,
          price: true,
          ingredients: {
            select: {
              quantityNeeded: true,
              material: {
                select: { unitCost: true },
              },
            },
          },
          productionBatches: {
            take: 1,
            orderBy: { productionDate: "desc" },
            select: { unitCost: true },
          },
        },
      }),
      prisma.order.findMany({
        include: {
          items: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // 2. Build product cost map
    const productCostMap = new Map<number, number>();
    productsWithCosts.forEach((p) => {
      let unitCost = 0;
      if (p.ingredients && p.ingredients.length > 0) {
        unitCost = p.ingredients.reduce(
          (sum, ing) => sum + Number(ing.quantityNeeded || 0) * Number(ing.material?.unitCost || 0),
          0
        );
      } else if (
        p.productionBatches &&
        p.productionBatches.length > 0 &&
        Number(p.productionBatches[0].unitCost || 0) > 0
      ) {
        unitCost = Number(p.productionBatches[0].unitCost);
      } else {
        // Fallback estimated production/procurement cost (55% COGS = 45% margin)
        unitCost = Number(p.price || 0) * 0.55;
      }
      productCostMap.set(p.id, Math.round(unitCost * 100) / 100);
    });

    // Helper to calculate cost for an order item
    const getItemCost = (productId: number | null, unitPrice: number, quantity: number) => {
      let uCost = 0;
      if (productId && productCostMap.has(productId)) {
        uCost = productCostMap.get(productId)!;
      } else {
        uCost = unitPrice * 0.55;
      }
      return uCost * quantity;
    };

    // Calculate BDT today & yesterday strings in Asia/Dhaka
    const bdtNowStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const bdtYesterdayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(yesterdayDate);

    // Accumulators for All Active (non-cancelled) and Delivered
    let activeSubtotal = 0;
    let activeDeliveryFees = 0;
    let activeDiscounts = 0;
    let activeTotalRev = 0;
    let activeCost = 0;
    let activeOrdersCount = 0;

    let deliveredSubtotal = 0;
    let deliveredDeliveryFees = 0;
    let deliveredDiscounts = 0;
    let deliveredTotalRev = 0;
    let deliveredCost = 0;
    let deliveredOrdersCount = 0;

    // Daily buckets map
    const dailyMap: Record<
      string,
      {
        date: string;
        displayDate: string;
        dayLabel: string;
        ordersCount: number;
        productSales: number;
        deliveryFees: number;
        discounts: number;
        totalRevenue: number;
        cost: number;
        profit: number;
        profitMargin: number;
        deliveredCount: number;
        pendingCount: number;
        activeCount: number;
      }
    > = {};

    allOrders.forEach((order) => {
      const isCancelled = order.orderStatus === "CANCELLED" || order.orderStatus === "RETURNED";
      const isDelivered = order.orderStatus === "DELIVERED";
      const subtotal = Number(order.subtotal || 0);
      const deliveryFee = Number(order.shippingFee || 0);
      const discount = Number(order.discountAmount || 0) + Number(order.coinsDiscount || 0);
      const totalAmount = Number(order.totalAmount || 0);

      let orderItemCost = 0;
      order.items.forEach((item) => {
        orderItemCost += getItemCost(item.productId, Number(item.unitPrice || 0), item.quantity);
      });

      // Active orders summary (excludes CANCELLED & RETURNED)
      if (!isCancelled) {
        activeSubtotal += subtotal;
        activeDeliveryFees += deliveryFee;
        activeDiscounts += discount;
        activeTotalRev += totalAmount;
        activeCost += orderItemCost;
        activeOrdersCount += 1;
      }

      // Delivered orders summary
      if (isDelivered) {
        deliveredSubtotal += subtotal;
        deliveredDeliveryFees += deliveryFee;
        deliveredDiscounts += discount;
        deliveredTotalRev += totalAmount;
        deliveredCost += orderItemCost;
        deliveredOrdersCount += 1;
      }

      // Daily Breakdown: only include if not cancelled
      if (!isCancelled) {
        // Date formatting in Asia/Dhaka
        const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(
          new Date(order.createdAt)
        );

        if (!dailyMap[dateKey]) {
          const dt = new Date(`${dateKey}T00:00:00+06:00`);
          let dayLabel = "";
          if (dateKey === bdtNowStr) {
            dayLabel = "আজ (Today)";
          } else if (dateKey === bdtYesterdayStr) {
            dayLabel = "গতকাল (Yesterday)";
          } else {
            dayLabel = dt.toLocaleDateString("bn-BD", { weekday: "short" });
          }

          const displayDate = dt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });

          dailyMap[dateKey] = {
            date: dateKey,
            displayDate,
            dayLabel,
            ordersCount: 0,
            productSales: 0,
            deliveryFees: 0,
            discounts: 0,
            totalRevenue: 0,
            cost: 0,
            profit: 0,
            profitMargin: 0,
            deliveredCount: 0,
            pendingCount: 0,
            activeCount: 0,
          };
        }

        dailyMap[dateKey].ordersCount += 1;
        dailyMap[dateKey].productSales += subtotal;
        dailyMap[dateKey].deliveryFees += deliveryFee;
        dailyMap[dateKey].discounts += discount;
        dailyMap[dateKey].totalRevenue += totalAmount;
        dailyMap[dateKey].cost += orderItemCost;

        if (isDelivered) {
          dailyMap[dateKey].deliveredCount += 1;
        }
        if (order.orderStatus === "PENDING") {
          dailyMap[dateKey].pendingCount += 1;
        }
        dailyMap[dateKey].activeCount += 1;
      }
    });

    // Finalize daily rows
    const dailyBreakdown = Object.values(dailyMap)
      .map((row) => {
        const netProfit = Math.round((row.productSales - row.discounts - row.cost) * 100) / 100;
        const profitMargin =
          row.productSales > 0 ? Math.round((netProfit / row.productSales) * 1000) / 10 : 0;

        return {
          ...row,
          productSales: Math.round(row.productSales * 100) / 100,
          deliveryFees: Math.round(row.deliveryFees * 100) / 100,
          discounts: Math.round(row.discounts * 100) / 100,
          totalRevenue: Math.round(row.totalRevenue * 100) / 100,
          cost: Math.round(row.cost * 100) / 100,
          profit: netProfit,
          profitMargin,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    // Calculate Active financials
    const activeProfit = Math.round((activeSubtotal - activeDiscounts - activeCost) * 100) / 100;
    const activeMargin =
      activeSubtotal > 0 ? Math.round((activeProfit / activeSubtotal) * 1000) / 10 : 0;

    // Calculate Delivered financials
    const deliveredProfit =
      Math.round((deliveredSubtotal - deliveredDiscounts - deliveredCost) * 100) / 100;
    const deliveredMargin =
      deliveredSubtotal > 0 ? Math.round((deliveredProfit / deliveredSubtotal) * 1000) / 10 : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalProducts,
        totalOrders,
        pendingOrders,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        recentOrders,
        totalRevenue: Math.round(deliveredTotalRev * 100) / 100, // backwards compatibility
        financials: {
          productSales: Math.round(activeSubtotal * 100) / 100,
          deliveryFees: Math.round(activeDeliveryFees * 100) / 100,
          discounts: Math.round(activeDiscounts * 100) / 100,
          totalRevenue: Math.round(activeTotalRev * 100) / 100,
          cost: Math.round(activeCost * 100) / 100,
          profit: activeProfit,
          profitMargin: activeMargin,
          ordersCount: activeOrdersCount,
        },
        deliveredFinancials: {
          productSales: Math.round(deliveredSubtotal * 100) / 100,
          deliveryFees: Math.round(deliveredDeliveryFees * 100) / 100,
          discounts: Math.round(deliveredDiscounts * 100) / 100,
          totalRevenue: Math.round(deliveredTotalRev * 100) / 100,
          cost: Math.round(deliveredCost * 100) / 100,
          profit: deliveredProfit,
          profitMargin: deliveredMargin,
          ordersCount: deliveredOrdersCount,
        },
        dailyBreakdown,
      },
    });
  } catch (error: any) {
    console.error("[Stats API Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
