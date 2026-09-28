"use client";
// components/storefront/CartDrawer.tsx - Polished Mobile & Desktop Cart Drawer

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight, Truck, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { formatTaka, getSafeImageUrl, formatBengaliNumber } from "@/lib/utils";

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    cartSubtotal,
    freeShippingThreshold,
    amountNeededForFreeShipping,
    hasFreeShipping,
    totalCartWeightKg,
    deliveryFee,
  } = useCart();

  const { locale } = useLanguage();
  const isBn = locale === "bn";

  if (!isCartOpen) return null;

  const progressPercent = Math.min(100, (cartSubtotal / freeShippingThreshold) * 100);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-white border-l border-stone-200 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          {/* 1. Header */}
          <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-[#FAF8F5]/90">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1F0E03] to-[#843A02] text-amber-300 flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-extrabold text-base sm:text-lg text-stone-900 leading-none">
                  {isBn ? "আপনার শপিং কার্ট" : "Shopping Cart"}
                </h2>
                <span className="text-[11px] text-stone-500 font-mono mt-0.5 block">
                  {isBn ? `${formatBengaliNumber(cart.length)} টি আইটেম যোগ করা হয়েছে` : `${cart.length} items added`}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 rounded-2xl hover:bg-stone-200/80 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer active:scale-90 border border-stone-200/60"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Free Shipping Threshold Bar */}
          <div className="px-4 py-3.5 bg-[#FAF8F5] border-b border-stone-200/90 text-xs">
            {hasFreeShipping ? (
              <div className="flex items-center gap-2 text-forest font-extrabold text-xs bg-emerald-50 border border-emerald-300 px-3.5 py-2.5 rounded-2xl shadow-xs animate-in zoom-in-95">
                <Truck className="w-4 h-4 text-emerald-600 shrink-0 animate-bounce-slow" />
                <span>{isBn ? "🎉 অভিনন্দন! আপনি পাচ্ছেন ১০০% ফ্রি ডেলিভারি!" : "🎉 Congratulations! You unlocked Free Shipping!"}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] text-stone-700 font-medium">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {isBn
                      ? `আর ${formatTaka(amountNeededForFreeShipping)} টাকার পণ্য যোগ করলেই ফ্রি ডেলিভারি!`
                      : `Add ${formatTaka(amountNeededForFreeShipping)} more for Free Delivery!`}
                  </span>
                  <span className="font-mono font-bold text-forest">{Math.round(progressPercent)}%</span>
                </div>
                <div className="w-full h-2.5 bg-stone-200/80 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 via-emerald-500 to-forest rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-stone-100">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-3.5">
                <div className="w-16 h-16 rounded-3xl bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-display font-bold text-stone-800 text-base">
                  {isBn ? "আপনার কার্ট খালি" : "Your cart is empty"}
                </h3>
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  {isBn ? "প্রাকৃতিক ও খাঁটি খাদ্যপণ্য যোগ করে অর্ডার সম্পন্ন করুন।" : "Add products from our organic catalog to proceed."}
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-2 inline-flex items-center gap-1.5 px-6 py-2.5 rounded-2xl bg-forest text-white text-xs font-bold shadow-xs hover:bg-forest/90 transition-all cursor-pointer active:scale-95"
                >
                  <span>{isBn ? "পণ্য দেখুন" : "Browse Products"}</span>
                </button>
              </div>
            ) : (
              cart.map((item) => {
                const imageSrc = item.image ? getSafeImageUrl(item.image) : "/placeholder.png";
                const price = Number(item.discountPrice || item.price);

                return (
                  <div key={item.id} className="pt-3.5 first:pt-0 flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-b from-[#FAF8F5] to-[#F3EEE5] border border-stone-200/80 overflow-hidden shrink-0 flex items-center justify-center p-1 shadow-xs">
                      <Image
                        src={imageSrc}
                        alt={item.name}
                        fill
                        unoptimized={true}
                        className="object-contain p-1 drop-shadow-xs"
                        sizes="64px"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.srcset = "";
                          target.src = "/placeholder.png";
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-display font-bold text-xs sm:text-sm text-stone-900 truncate">
                        {item.name}
                      </h4>
                      {item.unit && (
                        <span className="text-[10px] text-stone-400 font-mono block">
                          {item.unit}
                        </span>
                      )}
                      <span className="font-mono font-extrabold text-xs sm:text-sm text-forest">
                        {formatTaka(price)}
                      </span>
                    </div>

                    {/* Stepper & Remove */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-stone-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1 border border-stone-200 rounded-xl p-0.5 bg-stone-50">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center text-stone-700 hover:bg-stone-200 rounded-lg cursor-pointer active:scale-90"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono font-bold w-5 text-center text-stone-900">
                          {isBn ? formatBengaliNumber(item.quantity) : item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center text-stone-700 hover:bg-stone-200 rounded-lg cursor-pointer active:scale-90"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 4. Footer Checkout CTA */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-stone-200 bg-[#FAF8F5] space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-stone-600">{isBn ? "মোট মূল্য (Subtotal):" : "Subtotal:"}</span>
                <span className="font-mono font-extrabold text-xl text-forest">
                  {formatTaka(cartSubtotal)}
                </span>
              </div>

              {/* Weight & Delivery Preview */}
              <div className="flex items-center justify-between text-xs bg-white px-3.5 py-2.5 rounded-2xl border border-stone-200/90 shadow-2xs">
                <span className="text-stone-600 flex items-center gap-1 font-medium text-[11px]">
                  📦 পার্সেল ওজন: <strong className="text-stone-900 font-mono">{isBn ? formatBengaliNumber(totalCartWeightKg) : totalCartWeightKg} কেজি</strong>
                </span>
                <span className="text-stone-700 font-medium text-[11px]">
                  ডেলিভারি: <strong className="text-forest font-mono">{deliveryFee === 0 ? "ফ্রি" : formatTaka(deliveryFee)}</strong>
                </span>
              </div>

              <div className="space-y-2 pt-1">
                <Link
                  href="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-forest via-forest-light to-forest hover:from-forest-deep hover:to-forest text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-forest/25 hover:shadow-xl transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>{isBn ? "সরাসরি চেকআউট করুন" : "Proceed to Checkout"}</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </Link>

                <div className="flex items-center justify-center gap-2 text-[11px] text-stone-500 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isBn ? "ক্যাশ অন ডেলিভারি ও নিরাপদ পেমেন্ট" : "Cash on Delivery & Secure Payments"}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
