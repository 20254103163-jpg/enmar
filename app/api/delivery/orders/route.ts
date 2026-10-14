import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { notifyOrderStatusChanged } from "@/lib/notifications";

async function getAuthRider() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("enmar_delivery_session");
  if (!sessionCookie || !sessionCookie.value) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString("utf8")
    );
    const rider = await prisma.deliveryPersonnel.findUnique({
      where: { id: payload.id },
    });
    if (!rider || !rider.isActive) return null;
    return rider;
  } catch (e) {
    return null;
  }
}

// GET /api/delivery/orders - Fetch assigned deliveries for driver
export async function GET() {
  try {
    const rider = await getAuthRider();
    if (!rider) {
      return NextResponse.json({ error: "Unauthorized rider session" }, { status: 401 });
    }

    const assignedOrders = await prisma.order.findMany({
      where: {
        deliveryPersonnelId: rider.id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
      },
    });

    const activeOrders = assignedOrders.filter(
      (o) =>
        o.orderStatus === "CONFIRMED" ||
        o.orderStatus === "PROCESSING" ||
        o.orderStatus === "MAKING" ||
        o.orderStatus === "PACKED" ||
        o.orderStatus === "SHIPPED" ||
        o.orderStatus === "OUT_FOR_DELIVERY"
    );

    const completedOrders = assignedOrders.filter(
      (o) => o.orderStatus === "DELIVERED" || o.orderStatus === "CANCELLED"
    );

    return NextResponse.json({
      success: true,
      activeOrders,
      completedOrders: completedOrders.slice(0, 20),
    });
  } catch (error: any) {
    console.error("[Delivery Orders GET Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/delivery/orders - Rider updates order status
export async function PUT(req: NextRequest) {
  try {
    const rider = await getAuthRider();
    if (!rider) {
      return NextResponse.json({ error: "Unauthorized rider session" }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, orderStatus, note } = body;

    if (!orderId || !orderStatus) {
      return NextResponse.json(
        { error: "Order ID and target status are required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    });

    if (!order || order.deliveryPersonnelId !== rider.id) {
      return NextResponse.json(
        { error: "Order not found or not assigned to your route" },
        { status: 404 }
      );
    }

    const validTransitions: Record<string, string[]> = {
      CONFIRMED: ["PACKED", "SHIPPED", "OUT_FOR_DELIVERY"],
      PACKED: ["SHIPPED", "OUT_FOR_DELIVERY"],
      SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED"],
      OUT_FOR_DELIVERY: ["DELIVERED"],
    };

    const current = order.orderStatus;
    if (validTransitions[current] && !validTransitions[current].includes(orderStatus)) {
      return NextResponse.json(
        { error: `Cannot transition order from ${current} to ${orderStatus}` },
        { status: 400 }
      );
    }

    const updateData: any = {
      orderStatus,
    };

    // If delivered and payment was COD, mark as PAID
    if (orderStatus === "DELIVERED" && order.paymentMethod === "COD") {
      updateData.paymentStatus = "PAID";
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: updateData,
    });

    // Record Order History
    const statusNote = note || `Delivery status updated to ${orderStatus} by Rider ${rider.name} (${rider.phone})`;
    await prisma.orderHistory.create({
      data: {
        orderId: order.id,
        status: orderStatus as any,
        note: statusNote,
        actorRole: "DELIVERY_RIDER",
        actorName: rider.name,
      },
    });

    // Send notifications to customer
    try {
      await notifyOrderStatusChanged(
        {
          orderNumber: updatedOrder.orderNumber,
          trackingId: updatedOrder.trackingId,
          customerName: updatedOrder.customerName,
          customerEmail: updatedOrder.customerEmail,
          customerPhone: updatedOrder.customerPhone,
          courierPartner: updatedOrder.courierPartner || "ENMAR In-House Express",
          courierTrackingId: updatedOrder.courierTrackingId,
        },
        orderStatus,
        statusNote
      );
    } catch (notifErr) {
      console.error("[Delivery Notif Error]:", notifErr);
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: `Order status updated to ${orderStatus}`,
    });
  } catch (error: any) {
    console.error("[Delivery Orders PUT Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
