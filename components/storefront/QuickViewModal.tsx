"use client";
// components/storefront/QuickViewModal.tsx - Fast 1-Click Product Preview Modal

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, ShoppingBag, Zap, Leaf, Check, Star, ShieldCheck, Truck, Plus, Minus, ArrowRight } from "lucide-react";
import { formatTaka, getProductImages, getSafeImageUrl, formatProductUnit } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";

interface QuickViewModalProps {
  product: any | null;
  onClose: () => void;
}

export default function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const { addToCart, setIsCartOpen } = useCart();
  const { locale } = useLanguage();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const isBn = locale === "bn";

  if (!product) return null;

  const images = getProductImages(product.images);
  const imageSrc = images[0] ? getSafeImageUrl(images[0]) : "/placeholder.png";
  const formattedUnit = formatProductUnit(product.unitQuantity, product.unit);
  const effectivePrice = Number(product.discountPrice || product.price);
  const hasDiscount = product.discountPrice && Number(product.discountPrice) < Number(product.price);
  const discountPercent = hasDiscount
    ? Math.round(((Number(product.price) - Number(product.discountPrice)) / Number(product.price)) * 100)
    : 0;

  const handleAdd = () => {
    addToCart(product, qty);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
      setIsCartOpen(true);
    }, 800);
  };

  const handleBuyNow = () => {
    addToCart(product, qty);
    window.location.href = "/checkout";
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-2xl rounded-3xl sm:rounded-4xl shadow-2xl border border-stone-200/90 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 p-5 sm:p-7">
          {/* Left: Product Image (Clean Edge-to-Edge Frame) */}
          <div className="relative aspect-square rounded-2xl sm:rounded-3xl bg-stone-100 border border-stone-200/80 overflow-hidden">
            <Image
              src={imageSrc}
              alt={product.name}
              fill
              unoptimized={true}
              className="object-cover object-center transition-transform duration-500 hover:scale-105"
              sizes="380px"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.srcset = "";
                target.src = "/placeholder.png";
              }}
            />
            {hasDiscount && (
              <span className="absolute top-3.5 right-3.5 px-2.5 py-0.5 rounded-lg bg-red-600 text-white text-xs font-black shadow-md z-10">
                -{discountPercent}%
              </span>
            )}
            {product.organicCertified && (
              <span className="absolute top-3.5 left-3.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0F4A24]/90 backdrop-blur-md text-emerald-300 text-[10px] font-extrabold uppercase shadow-sm z-10">
                <Leaf className="w-3 h-3 text-emerald-400" />
                <span>{isBn ? "১০০% খাঁটি" : "Organic"}</span>
              </span>
            )}
          </div>

          {/* Right: Product Details & Actions */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              {product.category?.name && (
                <span className="text-[11px] font-bold uppercase tracking-wider text-forest/90 block">
                  {product.category.name}
                </span>
              )}

              <h3 className="font-display font-bold text-base sm:text-xl text-stone-900 leading-snug">
                {product.name}
              </h3>

              {formattedUnit && (
                <span className="inline-block text-xs font-semibold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-md">
                  {formattedUnit}
                </span>
              )}

              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-xl sm:text-2xl font-black font-mono text-forest">
                  {formatTaka(effectivePrice)}
                </span>
                {hasDiscount && (
                  <span className="text-xs font-mono text-stone-400 line-through">
                    {formatTaka(Number(product.price))}
                  </span>
                )}
              </div>

              {product.shortDescription && (
                <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed pt-1">
                  {product.shortDescription}
                </p>
              )}
            </div>

            {/* Quantity Stepper & Actions */}
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">
                  {isBn ? "পরিমাণ নির্বাচন করুন:" : "Select Quantity:"}
                </span>
                <div className="flex items-center gap-2 border border-stone-200 rounded-xl p-1 bg-stone-50">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-7 h-7 flex items-center justify-center text-stone-700 hover:bg-stone-200 rounded-lg cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-mono font-bold w-6 text-center text-stone-900">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="w-7 h-7 flex items-center justify-center text-stone-700 hover:bg-stone-200 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  className={`py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                    added
                      ? "bg-emerald-600 text-white"
                      : "bg-[#F8F6F2] hover:bg-stone-200 text-stone-800 border border-stone-200"
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{isBn ? "যোগ হয়েছে!" : "Added!"}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4 text-forest" />
                      <span>{isBn ? "কার্টে যোগ" : "Add to Cart"}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="py-3 px-3 rounded-xl font-extrabold text-xs bg-gradient-to-r from-forest to-forest-light hover:from-forest-deep hover:to-forest text-white flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>{isBn ? "এখনই কিনুন" : "Buy Now"}</span>
                </button>
              </div>

              <div className="text-center">
                <Link
                  href={`/products/${product.slug || product.id}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-forest hover:underline"
                >
                  <span>{isBn ? "সম্পূর্ণ বিবরণ দেখুন" : "View Full Details"}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
