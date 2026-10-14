// app/api/admin/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { notifyOrderStatusChanged } from "@/lib/notifications";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: true },
        },
        history: {
          orderBy: { createdAt: "desc" },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
        promoCode: true,
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        deliveryPersonnel: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            isSharingLocation: true,
            currentLat: true,
            currentLng: true,
            lastLocationUpdate: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
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
    const orderId = Number(id);
    const body = await req.json();

    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const {
      deliveryPersonnelId,
      orderStatus,
      paymentStatus,
      courierPartner,
      courierTrackingId,
      estimatedDelivery,
      adminNotes,
      actorRole = "ADMIN",
      actorName = "Admin",
      statusNote,
      cancellationReason,
      refundStatus,
    } = body;

    const dataToUpdate: any = {};
    if (paymentStatus) dataToUpdate.paymentStatus = paymentStatus as PaymentStatus;
    if (courierPartner !== undefined) dataToUpdate.courierPartner = courierPartner;
    if (courierTrackingId !== undefined) dataToUpdate.courierTrackingId = courierTrackingId;
    if (estimatedDelivery !== undefined) dataToUpdate.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : null;
    if (adminNotes !== undefined) dataToUpdate.adminNotes = adminNotes;
    if (cancellationReason !== undefined) dataToUpdate.cancellationReason = cancellationReason;
    if (deliveryPersonnelId !== undefined) {
      dataToUpdate.deliveryPersonnelId = deliveryPersonnelId ? Number(deliveryPersonnelId) : null;
    }
    if (refundStatus !== undefined) {
      dataToUpdate.refundStatus = refundStatus;
      dataToUpdate.refundNeeded = refundStatus === "REFUND_NEEDED";
    }

    if (body.shippingFee !== undefined && !isNaN(Number(body.shippingFee))) {
      const newShippingFee = Math.max(0, Number(body.shippingFee));
      dataToUpdate.shippingFee = newShippingFee;
      // Automatically recalculate totalAmount
      const subtotal = Number(existing.subtotal || 0);
      const discountAmount = Number(existing.discountAmount || 0);
      const coinsDiscount = Number(existing.coinsDiscount || 0);
      dataToUpdate.totalAmount = Math.max(0, subtotal + newShippingFee - discountAmount - coinsDiscount);
    }

    const isStatusChanged = orderStatus && orderStatus !== existing.orderStatus;
    const isCancelling = isStatusChanged && orderStatus === "CANCELLED";

    if (isStatusChanged) {
      dataToUpdate.orderStatus = orderStatus as OrderStatus;
    }

    if (isCancelling) {
      const isPaidOnline = (existing.paymentStatus as any) === "PAID" || (existing.paymentMethod !== "COD" && (existing.paymentStatus as any) === "PAID");
      if (isPaidOnline) {
        dataToUpdate.refundNeeded = true;
        dataToUpdate.refundStatus = "REFUND_NEEDED";
      }
      if (cancellationReason) {
        dataToUpdate.cancellationReason = cancellationReason;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: dataToUpdate,
      });

      if (isStatusChanged) {
        const note = cancellationReason || statusNote || `Status updated to ${orderStatus} by ${actorName}`;
        await tx.orderHistory.create({
          data: {
            orderId: orderId,
            status: orderStatus as OrderStatus,
            note,
            actorRole: actorRole,
            actorName: actorName,
          },
        });
      }

      // If cancelling, restore inventory stock for all products in this order
      if (isCancelling) {
        for (const item of existing.items) {
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: {
                  increment: item.quantity,
                },
              },
            });
          }
        }
      }

      return order;
    });

    if (isStatusChanged) {
      const finalNote = cancellationReason || statusNote;
      notifyOrderStatusChanged(updated, orderStatus, finalNote).catch((err) =>
        console.error("[notifyOrderStatusChanged Exception]:", err)
      );
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    console.error("[Order PUT Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const PATCH = PUT;

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);

    const existing = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Delete related records in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.orderHistory.deleteMany({ where: { orderId } });
      await tx.orderMessage.deleteMany({ where: { orderId } });
      await tx.returnRequest.deleteMany({ where: { orderId } });
      await tx.orderItem.deleteMany({ where: { orderId } });
      await tx.order.delete({ where: { id: orderId } });
    });

    return NextResponse.json({
      success: true,
      message: "Order deleted successfully from tracking history.",
    });
  } catch (error: any) {
    console.error("[Order DELETE Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
