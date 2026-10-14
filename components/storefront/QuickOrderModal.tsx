"use client";
// components/storefront/QuickOrderModal.tsx - 1-Click Fast Checkout Drawer with Add-ons, WhatsApp & Confetti

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import confetti from "canvas-confetti";
import {
  X,
  Plus,
  Minus,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Phone,
  MapPin,
  User,
  Loader2,
  Sparkles,
  Zap,
  MessageCircle,
  Share2,
} from "lucide-react";
import { formatTaka, getSafeImageUrl, getProductImages } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface QuickOrderModalProps {
  product: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickOrderModal({ product, isOpen, onClose }: QuickOrderModalProps) {
  const router = useRouter();
  const { locale } = useLanguage();
  const isBn = locale === "bn";

  const [mounted, setMounted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [includeChutney, setIncludeChutney] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [deliveryZone, setDeliveryZone] = useState<"Inside Dhaka" | "Outside Dhaka">("Inside Dhaka");
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (orderSuccess) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#843A02", "#D97706", "#10B981", "#F59E0B"],
        });
      } catch (e) {}
    }
  }, [orderSuccess]);

  if (!isOpen || !product || !mounted) return null;

  const images = getProductImages(product.images);
  const imageSrc = images[0] ? getSafeImageUrl(images[0]) : "/placeholder.png";
  const unitPrice = Number(product.discountPrice || product.price);
  const chutneyPrice = includeChutney ? 50 : 0;
  const subtotal = unitPrice * quantity + chutneyPrice;

  // Delivery calculation: Inside Dhaka ৳100 base fee (Free delivery if 3+ items or ৳800+)
  const isFreeDelivery = quantity >= 3 || subtotal >= 800;
  const deliveryFee = isFreeDelivery ? 0 : 100;
  const grandTotal = subtotal + deliveryFee;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!customerName.trim()) {
      setErrorMessage(isBn ? "অনুগ্রহ করে আপনার নাম লিখুন।" : "Please enter your name.");
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, "").length < 11) {
      setErrorMessage(
        isBn
          ? "অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।"
          : "Please enter a valid 11-digit mobile number."
      );
      return;
    }
    if (!shippingAddress.trim()) {
      setErrorMessage(
        isBn ? "অনুগ্রহ করে সম্পূর্ণ ডেলিভারি ঠিকানা লিখুন।" : "Please enter complete delivery address."
      );
      return;
    }

    setSubmitting(true);
    try {
      const itemsList = [
        {
          productId: product.id,
          productName: product.name,
          unitPrice,
          quantity,
          unit: product.unit || "প্যাক",
          itemImage: imageSrc,
          totalPrice: unitPrice * quantity,
        },
      ];

      if (includeChutney) {
        itemsList.push({
          productId: 999999,
          productName: "স্পেশাল হোমমেড মোমো চাটনি ও ডিপ সস (১ বাটি)",
          unitPrice: 50,
          quantity: 1,
          unit: "বাটি",
          itemImage: imageSrc,
          totalPrice: 50,
        });
      }

      const orderPayload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: "quick-order@enmar.bd",
        shippingAddress: shippingAddress.trim(),
        deliveryZone: "Inside Dhaka",
        paymentMethod: "COD",
        customerNotes: `⚡ ১-ক্লিক ঝটপট ফ্রোজেন ফুড অর্ডার${includeChutney ? " (সাথে স্পেশাল চাটনি)" : ""}`,
        subtotal,
        discountAmount: 0,
        shippingFee: deliveryFee,
        totalAmount: grandTotal,
        items: itemsList,
      };

      const res = await fetch("/api/storefront/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const json = await res.json();
      if (json.success && json.order) {
        setOrderSuccess(json.order);
      } else {
        setErrorMessage(json.error || (isBn ? "অর্ডার নেওয়া সম্ভব হয়নি। আবার চেষ্টা করুন।" : "Failed to place order."));
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error submitting order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsAppOrder = () => {
    const text = encodeURIComponent(
      `*নতুন ফ্রোজেন ফুড অর্ডার — ENMAR*\n\n` +
      `📦 *পণ্য:* ${product.name} (${quantity}টি প্যাক)\n` +
      (includeChutney ? `🥟 *অ্যাড-অন:* স্পেশাল চাটনি (৳৫০)\n` : "") +
      `💰 *মোট বিল:* ${formatTaka(grandTotal)} (ক্যাশ অন ডেলিভারি)\n` +
      `📍 *ডেলিভারি এলাকা:* ঢাকা সিটির ভেতরে (${isFreeDelivery ? "ফ্রি" : "৳১০০"})\n` +
      (customerName ? `👤 *নাম:* ${customerName}\n` : "") +
      (customerPhone ? `📞 *ফোন:* ${customerPhone}\n` : "") +
      (shippingAddress ? `🏠 *ঠিকানা:* ${shippingAddress}\n` : "") +
      `\nআমি এই অর্ডারটি কনফার্ম করতে চাই।`
    );
    window.open(`https://wa.me/8801700000000?text=${text}`, "_blank");
  };

  return createPortal(
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[99999] overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[92vh]"
      >
        {/* Modal Header (Fixed) */}
        <div className="bg-[#241205] p-4 sm:p-5 text-white flex items-center justify-between shrink-0 border-b border-amber-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-md">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black font-display text-white leading-tight">
                {isBn ? "১-ক্লিক ঝটপট অর্ডার" : "1-Click Quick Order"}
              </h3>
              <p className="text-[11px] text-amber-200/90 font-medium">
                {isBn ? "ক্যাশ অন ডেলিভারি (পণ্য পেয়ে টাকা দিন)" : "Cash on Delivery Available"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-stone-200 hover:text-white flex items-center justify-center text-sm cursor-pointer transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {orderSuccess ? (
          /* Order Confirmation Success State */
          <div className="p-6 sm:p-8 text-center space-y-4 overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-xl font-extrabold text-stone-900 font-display">
                {isBn ? "🎉 আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে!" : "Order Confirmed Successfully!"}
              </h4>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                {isBn
                  ? `ধন্যবাদ ${orderSuccess.customerName}, আমাদের প্রতিনিধি শীঘ্রই কল করে ডেলিভারি নিশ্চিত করবেন।`
                  : `Thank you, your order has been received.`}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-stone-500">ট্র্যাকিং আইডি:</span>
                <span className="font-bold text-forest">{orderSuccess.trackingId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">মোট মূল্য (COD):</span>
                <span className="font-bold text-stone-900">{formatTaka(orderSuccess.totalAmount)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/track/${orderSuccess.trackingId}`);
                }}
                className="flex-1 py-3 rounded-xl bg-forest hover:bg-forest-deep text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
              >
                {isBn ? "অর্ডার ট্র্যাক করুন" : "Track Order"}
              </button>

              <button
                type="button"
                onClick={() => {
                  const text = encodeURIComponent(
                    `হ্যালো ENMAR, আমি এইমাত্র অর্ডার করেছি!\nট্র্যাকিং আইডি: ${orderSuccess.trackingId}\nমোট বিল: ${formatTaka(orderSuccess.totalAmount)}`
                  );
                  window.open(`https://wa.me/8801700000000?text=${text}`, "_blank");
                }}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>হোয়াটসঅ্যাপে মেমো পাঠান</span>
              </button>
            </div>
          </div>
        ) : (
          /* Order Placement Form with Scrollable Body & Sticky Footer */
          <form onSubmit={handleSubmitOrder} className="flex flex-col flex-1 min-h-0">
            {/* Scrollable Form Body */}
            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              {/* Selected Product Summary Box */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF8F5] border border-stone-200">
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-stone-200 shrink-0 border border-stone-300/80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageSrc} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                    {product.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-black text-forest font-mono">
                      {formatTaka(unitPrice)}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      / {product.unitQuantity ? `${product.unitQuantity} ` : ""}{product.unit || "প্যাক"}
                    </span>
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-xl p-1 shadow-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer active:scale-90"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold font-mono text-stone-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer active:scale-90"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Free Delivery Nudge Badge */}
              <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-stone-800 font-bold text-[11px] sm:text-xs">
                  <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                  {isFreeDelivery ? (
                    <span className="text-emerald-700 font-black">🎉 অভিনন্দন! ফ্রি হোম ডেলিভারি পাচ্ছেন!</span>
                  ) : (
                    <span>যেকোনো ৩টি প্যাকেট কিনলেই ডেলিভারি সম্পূর্ণ ফ্রি!</span>
                  )}
                </span>
                {!isFreeDelivery && (
                  <button
                    type="button"
                    onClick={() => setQuantity(3)}
                    className="text-[10.5px] text-forest font-extrabold underline cursor-pointer hover:text-amber-800"
                  >
                    ৩ প্যাক করুন (ফ্রি ডেলিভারি)
                  </button>
                )}
              </div>

              {/* Order Bump Add-on (Special Homemade Momo Chutney / Dip) */}
              <label
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  includeChutney
                    ? "bg-amber-100/60 border-amber-400 ring-1 ring-amber-400"
                    : "bg-[#FDFBF7] border-amber-200/80 hover:bg-amber-50/50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={includeChutney}
                    onChange={(e) => setIncludeChutney(e.target.checked)}
                    className="w-4 h-4 text-forest rounded accent-forest shrink-0 cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-stone-900">
                        🥟 সাথে নিন স্পেশাল হোমমেড মোমো চাটনি ও ডিপ সস
                      </span>
                      <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-extrabold">
                        +৳৫০
                      </span>
                    </div>
                    <p className="text-[10.5px] text-stone-500 mt-0.5">
                      খাঁটি উপাদান দিয়ে তৈরি স্পাইসি চাটনি যা নাস্তার স্বাদ দ্বিগুণ করবে।
                    </p>
                  </div>
                </div>
              </label>

              {/* Customer Inputs */}
              <div className="space-y-2.5 pt-0.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    আপনার নাম <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="যেমন: তানভীর আহমেদ"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-forest focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    মোবাইল নম্বর <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      placeholder="01XXXXXXXXX"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono text-stone-900 focus:outline-none focus:border-forest focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    ডেলিভারি ঠিকানা <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <textarea
                      required
                      rows={2}
                      placeholder="বাসা নং, রোড নং, এলাকা ও থানার নাম লিখুন..."
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-forest focus:bg-white transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Delivery Zone Radio Selector */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    ডেলিভারি এলাকা
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all border-forest bg-emerald-50/60 ring-1 ring-forest`}
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="quickDeliveryZone"
                          checked={true}
                          readOnly
                          className="w-3.5 h-3.5 text-forest"
                        />
                        <span className="text-xs font-bold text-stone-900">ঢাকা সিটির ভেতরে</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-forest">
                        {isFreeDelivery ? "ফ্রি" : "৳১০০"}
                      </span>
                    </label>

                    <div
                      className="p-2 rounded-xl border border-dashed border-stone-300 bg-stone-100/70 flex items-center justify-between cursor-not-allowed opacity-70"
                      title="ঢাকার বাইরে আপাতত ডেলিভারি সেবা নেই"
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="quickDeliveryZone"
                          disabled
                          checked={false}
                          className="w-3.5 h-3.5 text-stone-400"
                        />
                        <div>
                          <span className="text-xs font-bold text-stone-500 block">ঢাকার বাইরে</span>
                          <span className="text-[9px] text-amber-700 font-bold">আপাতত বন্ধ</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-stone-400">সেবা নেই</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-1 flex items-center gap-1">
                    <span>ℹ️ সর্বোচ্চ সতেজতা নিশ্চিত করতে ডেলিভারি সেবা শুধুমাত্র ঢাকা সিটির ভেতরে চালু রয়েছে।</span>
                  </p>
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="p-2.5 rounded-2xl bg-stone-100 border border-stone-200 space-y-1 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>পণ্যের মূল্য ({quantity}টি):</span>
                  <span className="font-mono font-bold">{formatTaka(unitPrice * quantity)}</span>
                </div>
                {includeChutney && (
                  <div className="flex justify-between text-amber-900 font-semibold">
                    <span>স্পেশাল মোমো চাটনি:</span>
                    <span className="font-mono font-bold">+৳৫০</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>ডেলিভারি চার্জ:</span>
                  <span className={`font-mono font-bold ${isFreeDelivery ? "text-emerald-700" : ""}`}>
                    {isFreeDelivery ? "ফ্রি (৳০)" : formatTaka(deliveryFee)}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm font-black text-stone-950 pt-1 border-t border-stone-300">
                  <span>সর্বমোট বিল (ক্যাশ অন ডেলিভারি):</span>
                  <span className="font-mono text-forest font-black text-sm sm:text-base">{formatTaka(grandTotal)}</span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  ⚠️ {errorMessage}
                </div>
              )}
            </div>

            {/* Sticky Dual Action Footer */}
            <div className="p-3 sm:p-4 bg-white border-t border-stone-200 shrink-0 space-y-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-forest to-[#843A02] hover:opacity-95 text-amber-300 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-950/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>অর্ডার তৈরি হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>অর্ডার কনফার্ম করুন — {formatTaka(grandTotal)} (COD)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleWhatsAppOrder}
                className="w-full py-2.5 rounded-xl border border-emerald-500/80 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>হোয়াটসঅ্যাপে সরাসরি অর্ডার দিন</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
