// app/api/storefront/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber, generateTrackingId, getProductImages, getSafeImageUrl } from "@/lib/utils";
import { PaymentMethod, PaymentStatus, OrderStatus } from "@prisma/client";
import { notifyOrderPlaced } from "@/lib/notifications";
import { calculateDeliveryFee } from "@/lib/delivery-calculator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const customerName = (body.customerName || body.name || "").trim();
    const customerPhone = (body.customerPhone || body.phone || "").trim();
    const customerEmail = (body.customerEmail || body.email || "quick-order@enmar.bd").trim();
    const shippingAddress = (body.shippingAddress || body.customerAddress || body.address || "").trim();
    const {
      deliveryZone = "Inside Dhaka",
      paymentMethod = "COD",
      items = [],
      promoCodeId,
      promoCodeText,
      customerNotes,
      userId,
      deliverySlot,
      preferredDeliveryDate,
      coinsRedeemed = 0,
      coinsDiscount = 0,
    } = body;

    if (!customerName || !customerPhone || !shippingAddress) {
      return NextResponse.json(
        { error: "অনুগ্রহ করে আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ডেলিভারি ঠিকানা প্রদান করুন।" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "আপনার কার্টে কোনো পণ্য নেই। অর্ডার করতে কার্টে পণ্য যোগ করুন।" },
        { status: 400 }
      );
    }

    let subtotal = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      let product = null;

      // 1. Try finding by ID
      if (item.productId && !isNaN(Number(item.productId)) && Number(item.productId) > 0) {
        product = await prisma.product.findUnique({
          where: { id: Number(item.productId) },
        });
      }

      // 2. Try finding by Name if not found by ID
      if (!product && item.productName) {
        product = await prisma.product.findFirst({
          where: {
            OR: [
              { name: { contains: String(item.productName).trim() } },
              { slug: { contains: String(item.productName).toLowerCase().trim().replace(/\s+/g, "-") } },
            ],
          },
        });
      }

      // 3. Fallback: If still not found, search any first active product or create fallback validation
      if (!product) {
        product = await prisma.product.findFirst();
      }

      if (product) {
        const qty = Math.max(1, Number(item.quantity || 1));

        // Use DB verified price
        const unitPrice = Number(product.discountPrice || product.price || 0);
        const itemTotal = unitPrice * qty;
        subtotal += itemTotal;

        const productImgs = getProductImages(product.images);
        const imageSrc =
          productImgs.length > 0
            ? productImgs[0]
            : getSafeImageUrl(item.itemImage);

        validatedItems.push({
          productId: product.id,
          productName: product.name || item.productName || "Organic Item",
          unitPrice,
          quantity: qty,
          unit: product.unit || item.unit || "piece",
          weightInGrams: product.weightInGrams || 100,
          deliveryDiscountMinQty: product.deliveryDiscountMinQty ? Number(product.deliveryDiscountMinQty) : 0,
          deliveryDiscountAmount: product.deliveryDiscountAmount ? Number(product.deliveryDiscountAmount) : 0,
          deliveryDiscountType: product.deliveryDiscountType || "FIXED",
          deliveryDiscountTiers: product.deliveryDiscountTiers || null,
          itemImage: imageSrc,
          totalPrice: itemTotal,
        });
      }
    }

    if (validatedItems.length === 0) {
      return NextResponse.json(
        { error: "নির্বাচিত পণ্যগুলো প্রক্রিয়াকরণ করা সম্ভব হয়নি। অনুগ্রহ করে কার্ট রিফ্রেশ করুন।" },
        { status: 400 }
      );
    }

    // Dynamic weight-based delivery fee settings
    let freeShippingThreshold = 1500;
    let baseDeliveryFee = 100;
    let perExtraKgFee = 20;
    let baseWeightKg = 1.0;

    try {
      const [thresholdSetting, baseFeeSetting, extraKgSetting, baseWeightSetting] = await Promise.all([
        prisma.siteSetting.findUnique({ where: { key: "delivery_free_shipping_threshold" } }),
        prisma.siteSetting.findUnique({ where: { key: "delivery_base_fee" } }),
        prisma.siteSetting.findUnique({ where: { key: "delivery_per_extra_kg" } }),
        prisma.siteSetting.findUnique({ where: { key: "delivery_base_weight_kg" } }),
      ]);
      if (thresholdSetting && Number(thresholdSetting.value) > 0) {
        freeShippingThreshold = Number(thresholdSetting.value);
      }
      if (baseFeeSetting && Number(baseFeeSetting.value) >= 0) {
        baseDeliveryFee = Number(baseFeeSetting.value);
      }
      if (extraKgSetting && Number(extraKgSetting.value) >= 0) {
        perExtraKgFee = Number(extraKgSetting.value);
      }
      if (baseWeightSetting && Number(baseWeightSetting.value) > 0) {
        baseWeightKg = Number(baseWeightSetting.value);
      }
    } catch (e) {}

    // Check Promo Code first to detect Free Shipping promo
    let discountAmount = 0;
    let hasFreeShippingPromo = false;

    if (promoCodeId) {
      try {
        const promo = await prisma.promoCode.findUnique({
          where: { id: Number(promoCodeId) },
        });
        if (promo && promo.isActive) {
          if (promo.discountType === "PERCENTAGE") {
            discountAmount = (subtotal * Number(promo.discountValue)) / 100;
            if (promo.maxDiscountAmount && discountAmount > Number(promo.maxDiscountAmount)) {
              discountAmount = Number(promo.maxDiscountAmount);
            }
          } else if (promo.discountType === "FIXED") {
            discountAmount = Number(promo.discountValue);
          } else if (promo.discountType === "FREE_SHIPPING") {
            hasFreeShippingPromo = true;
          }
        }
      } catch (e) {}
    }

    const deliveryCalc = calculateDeliveryFee({
      items: validatedItems,
      subtotal,
      hasFreeShippingPromo,
      baseDeliveryFee,
      baseWeightKg,
      perExtraKgFee,
      freeShippingThreshold,
    });

    // Distinct delivery charge calculation:
    // If free shipping applies via promo or threshold, fee is strictly 0.
    // Otherwise, respect client-calculated fee if provided (which includes delivery zone / express slot fees), or fallback to deliveryCalc.
    let shippingFee = deliveryCalc.finalDeliveryFee;
    if (hasFreeShippingPromo || deliveryCalc.isFreeShipping) {
      shippingFee = 0;
    } else if (body.shippingFee !== undefined && !isNaN(Number(body.shippingFee)) && Number(body.shippingFee) >= 0) {
      shippingFee = Number(body.shippingFee);
    }

    const numCoinsRedeemed = Math.max(0, parseInt(String(coinsRedeemed), 10) || 0);
    const numCoinsDiscount = Math.max(0, parseFloat(String(coinsDiscount)) || 0);
    const totalAmount = Math.max(0, subtotal - discountAmount - numCoinsDiscount + shippingFee);
    const orderNumber = generateOrderNumber();
    const trackingId = generateTrackingId();

    // 1 Coin earned per ৳10 spent
    const coinsEarned = Math.floor(totalAmount / 10);

    const orderItemsForDb = validatedItems.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      unit: it.unit,
      itemImage: it.itemImage || null,
      totalPrice: it.totalPrice,
    }));

    let mappedPaymentMethod: PaymentMethod = PaymentMethod.COD;
    const pmUpper = String(paymentMethod || "").toUpperCase();
    if (pmUpper === "BKASH") mappedPaymentMethod = PaymentMethod.BKASH;
    else if (pmUpper === "NAGAD") mappedPaymentMethod = PaymentMethod.NAGAD;
    else if (pmUpper === "ROCKET") mappedPaymentMethod = PaymentMethod.ROCKET;
    else if (pmUpper === "SSLCOMMERZ" || pmUpper === "ONLINE" || pmUpper === "CARD") mappedPaymentMethod = PaymentMethod.CARD;
    else mappedPaymentMethod = PaymentMethod.COD;

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          trackingId,
          customerName: customerName.trim(),
          customerEmail: customerEmail?.trim() || "guest@enmar.bd",
          customerPhone: customerPhone.trim(),
          shippingAddress: shippingAddress.trim(),
          deliveryZone,
          subtotal,
          discountAmount,
          promoCodeId: promoCodeId ? Number(promoCodeId) : null,
          promoCodeText: promoCodeText || null,
          shippingFee,
          totalAmount,
          deliverySlot: deliverySlot || null,
          preferredDeliveryDate: preferredDeliveryDate || null,
          coinsEarned,
          coinsRedeemed: numCoinsRedeemed,
          coinsDiscount: numCoinsDiscount,
          paymentMethod: mappedPaymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          orderStatus: OrderStatus.PENDING,
          userId: userId ? Number(userId) : null,
          customerNotes: customerNotes || null,
          items: {
            create: orderItemsForDb,
          },
        },
      });

      await tx.orderHistory.create({
        data: {
          orderId: createdOrder.id,
          status: OrderStatus.PENDING,
          note: "Order placed successfully. Awaiting order verification.",
          actorRole: "CUSTOMER",
          actorName: customerName,
        },
      });

      // Handle Loyalty Wallet updates
      if (userId) {
        try {
          let wallet = await tx.loyaltyWallet.findUnique({
            where: { userId: Number(userId) },
          });

          if (!wallet) {
            wallet = await tx.loyaltyWallet.create({
              data: {
                userId: Number(userId),
                coinsBalance: Math.max(0, coinsEarned - numCoinsRedeemed),
                totalEarned: coinsEarned,
                totalSpent: numCoinsRedeemed,
              },
            });
          } else {
            const nextBalance = Math.max(0, wallet.coinsBalance - numCoinsRedeemed + coinsEarned);
            await tx.loyaltyWallet.update({
              where: { id: wallet.id },
              data: {
                coinsBalance: nextBalance,
                totalEarned: wallet.totalEarned + coinsEarned,
                totalSpent: wallet.totalSpent + numCoinsRedeemed,
              },
            });
          }

          if (numCoinsRedeemed > 0) {
            await tx.loyaltyTransaction.create({
              data: {
                walletId: wallet.id,
                amount: -numCoinsRedeemed,
                type: "REDEEM_ORDER",
                description: `Redeemed on Order #${createdOrder.orderNumber}`,
                orderId: createdOrder.id,
              },
            });
          }

          if (coinsEarned > 0) {
            await tx.loyaltyTransaction.create({
              data: {
                walletId: wallet.id,
                amount: coinsEarned,
                type: "EARN_PURCHASE",
                description: `Earned from Order #${createdOrder.orderNumber}`,
                orderId: createdOrder.id,
              },
            });
          }
        } catch (e) {
          console.warn("[Loyalty Wallet TX Error]:", e);
        }
      }

      if (promoCodeId) {
        try {
          await tx.promoCode.update({
            where: { id: Number(promoCodeId) },
            data: { usageCount: { increment: 1 } },
          });
        } catch (e) {}
      }

      for (const it of validatedItems) {
        try {
          await tx.product.update({
            where: { id: it.productId },
            data: { stockQuantity: { decrement: it.quantity } },
          });
        } catch (e) {}
      }

      return createdOrder;
    });

    notifyOrderPlaced(order).catch((err) =>
      console.error("[notifyOrderPlaced Non-blocking Exception]:", err)
    );

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error("[Create Order Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to create order" }, { status: 500 });
  }
}
