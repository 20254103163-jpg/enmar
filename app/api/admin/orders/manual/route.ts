// app/api/admin/orders/manual/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber, generateTrackingId, getSafeImageUrl } from "@/lib/utils";
import { PaymentMethod, PaymentStatus, OrderStatus } from "@prisma/client";
import { serverCache } from "@/lib/serverCache";
import { triggerSnapshotRebuild } from "@/lib/snapshotEngine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const customerName = (body.customerName || body.name || "").trim();
    const customerPhone = (body.customerPhone || body.phone || "").trim();
    const customerEmail = (body.customerEmail || body.email || "social-order@enmar.bd").trim();
    const shippingAddress = (body.shippingAddress || body.address || "").trim();
    const deliveryZone = body.deliveryZone || "Inside Dhaka";
    const paymentMethod = (body.paymentMethod || "COD").toUpperCase() as PaymentMethod;
    const items = Array.isArray(body.items) ? body.items : [];
    const shippingFee = Number(body.shippingFee ?? (deliveryZone === "Inside Dhaka" ? 100 : 150));
    const discountAmount = Number(body.discountAmount || 0);
    const customerNotes = body.customerNotes || "Social Media Order (Messenger/WhatsApp)";
    const adminNotes = body.adminNotes || "Created via /note Order Hub";

    if (!customerName || !customerPhone || !shippingAddress) {
      return NextResponse.json(
        { error: "কাস্টমারের নাম, মোবাইল নম্বর এবং সম্পূর্ণ ডেলিভারি ঠিকানা প্রয়োজন।" },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "কমপক্ষে ১টি পণ্য যোগ করুন।" },
        { status: 400 }
      );
    }

    // Clean phone number (e.g. 01712345678)
    let cleanPhone = customerPhone.replace(/\D/g, "");
    if (cleanPhone.startsWith("8801")) {
      cleanPhone = "0" + cleanPhone.slice(2);
    } else if (cleanPhone.length === 10 && cleanPhone.startsWith("1")) {
      cleanPhone = "0" + cleanPhone;
    }

    // Generate unique order number & tracking ID
    let trackingId = generateTrackingId();
    let orderNumber = generateOrderNumber();

    // Verify uniqueness
    let exists = await prisma.order.findUnique({ where: { trackingId } });
    while (exists) {
      trackingId = generateTrackingId();
      exists = await prisma.order.findUnique({ where: { trackingId } });
    }

    // Validate and build item records
    let calculatedSubtotal = 0;
    const validatedItems: any[] = [];
    const stockUpdates: { productId: number; decrement: number }[] = [];

    for (const item of items) {
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      let unitPrice = Number(item.unitPrice || 0);
      let productName = item.productName || "অর্গানিক ফুড আইটেম";
      let unit = item.unit || "piece";
      let itemImage = item.itemImage || "/assets/logo/logo.png";
      let productId = item.productId ? Number(item.productId) : null;

      if (productId && !isNaN(productId)) {
        const dbProduct = await prisma.product.findUnique({ where: { id: productId } });
        if (dbProduct) {
          productName = dbProduct.name;
          unitPrice = Number(dbProduct.discountPrice || dbProduct.price);
          unit = dbProduct.unit || "piece";
          if (Array.isArray(dbProduct.images) && dbProduct.images.length > 0) {
            itemImage = getSafeImageUrl(dbProduct.images[0]);
          } else if (typeof dbProduct.images === "string") {
            try {
              const parsed = JSON.parse(dbProduct.images);
              if (Array.isArray(parsed) && parsed[0]) {
                itemImage = getSafeImageUrl(parsed[0]);
              }
            } catch (e) {}
          }
          stockUpdates.push({ productId: dbProduct.id, decrement: qty });
        }
      }

      const itemTotal = unitPrice * qty;
      calculatedSubtotal += itemTotal;

      validatedItems.push({
        productId,
        productName,
        unitPrice,
        quantity: qty,
        unit,
        itemImage,
        totalPrice: itemTotal,
      });
    }

    const totalAmount = Math.max(0, calculatedSubtotal + shippingFee - discountAmount);

    // Save order in database with transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          trackingId,
          customerName,
          customerPhone: cleanPhone,
          customerEmail,
          shippingAddress,
          deliveryZone,
          subtotal: calculatedSubtotal,
          discountAmount,
          shippingFee,
          totalAmount,
          paymentMethod,
          paymentStatus: paymentMethod === "COD" ? PaymentStatus.PENDING : PaymentStatus.PAID,
          orderStatus: OrderStatus.CONFIRMED,
          customerNotes,
          adminNotes,
          items: {
            create: validatedItems.map((it) => ({
              productId: it.productId,
              productName: it.productName,
              unitPrice: it.unitPrice,
              quantity: it.quantity,
              unit: it.unit,
              itemImage: it.itemImage,
              totalPrice: it.totalPrice,
            })),
          },
          history: {
            create: {
              status: OrderStatus.CONFIRMED,
              note: `অর্ডারটি সোশ্যাল মিডিয়া / ম্যানুয়াল হাব (/note) থেকে তৈরি করা হয়েছে।`,
              actorRole: "ADMIN",
              actorName: "Store Admin",
            },
          },
        },
        include: {
          items: true,
        },
      });

      // Decrement inventory safely
      for (const update of stockUpdates) {
        await tx.product.update({
          where: { id: update.productId },
          data: {
            stockQuantity: {
              decrement: update.decrement,
            },
          },
        });
      }

      return order;
    });

    // Invalidate caches
    serverCache.invalidateAll();
    triggerSnapshotRebuild();

    // Prepare WhatsApp Message & Link
    const host = req.headers.get("host") || "enmar.com.bd";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const trackingUrl = `${protocol}://${host}/track/${newOrder.trackingId}`;

    const itemsSummary = validatedItems
      .map((it) => `• ${it.productName} (${it.quantity} ${it.unit}) - ৳${it.totalPrice}`)
      .join("\n");

    const discountLine = discountAmount > 0 ? `🏷️ ডিসকাউন্ট ছাড়: -৳${discountAmount}\n` : "";
    const whatsappMessage = `আসসালামু আলাইকুম ${customerName}! 🌿\nENMAR Organic Food-এ আপনার অর্ডারটি গ্রহণ করা হয়েছে।\n\n📦 অর্ডার নম্বর: #${newOrder.orderNumber}\n📍 ঠিকানা: ${shippingAddress}\n\n🛒 পণ্যের বিবরণ:\n${itemsSummary}\n\n💵 পণ্যের মোট মূল্য: ৳${calculatedSubtotal}\n🚚 ডেলিভারি চার্জ: ৳${shippingFee} (${deliveryZone})\n${discountLine}💰 সর্বমোট বিল: ৳${totalAmount} (${paymentMethod === "COD" ? "ক্যাশ অন ডেলিভারি" : "পরিশোধিত"})\n\n🔍 পার্সেল লাইভ ট্র্যাক করতে ভিজিট করুন:\n${trackingUrl}\n\nধন্যবাদ আমাদের সাথে থাকার জন্য! 💚`;

    const cleanWaPhone = cleanPhone.startsWith("0") ? "88" + cleanPhone : cleanPhone;
    const whatsappUrl = `https://wa.me/${cleanWaPhone}?text=${encodeURIComponent(whatsappMessage)}`;

    return NextResponse.json({
      success: true,
      order: newOrder,
      trackingUrl,
      whatsappUrl,
      whatsappMessage,
      messengerText: whatsappMessage,
    });
  } catch (error: any) {
    console.error("[Manual Order API Error]:", error);
    return NextResponse.json(
      { error: error.message || "ম্যানুয়াল অর্ডার তৈরিতে সমস্যা হয়েছে।" },
      { status: 500 }
    );
  }
}
