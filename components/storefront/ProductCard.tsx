"use client";
// components/storefront/ProductCard.tsx - Ultra-Premium Luxury Product Card

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Zap, Leaf, Check, Star, Plus, Eye, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { formatTaka, getProductImages, getSafeImageUrl, formatProductUnit, formatBengaliNumber } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";

const QuickOrderModal = dynamic(
  () => import("@/components/storefront/QuickOrderModal"),
  { ssr: false }
);

interface ProductCardProps {
  product: any;
  onQuickView?: (product: any) => void;
}

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { locale } = useLanguage();
  const [added, setAdded] = useState(false);
  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);
  const isBn = locale === "bn";

  const images = getProductImages(product.images);
  const imageSrc = images[0] ? getSafeImageUrl(images[0]) : "/placeholder.png";

  const formattedUnit = formatProductUnit(product.unitQuantity, product.unit);

  const effectivePrice = Number(product.discountPrice || product.price);
  const hasDiscount =
    product.discountPrice && Number(product.discountPrice) < Number(product.price);
  const discountPercent = hasDiscount
    ? Math.round(
        ((Number(product.price) - Number(product.discountPrice)) /
          Number(product.price)) *
          100
      )
    : 0;

  const productSlug = product.slug || String(product.id);
  const productHref = `/products/${productSlug}`;

  const handleCardClick = (e: React.MouseEvent) => {
    if (isQuickOrderOpen) return;
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("form")
    ) {
      return;
    }
    router.push(productHref);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickOrderOpen(true);
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => router.prefetch(productHref)}
      className="group bg-white rounded-xl sm:rounded-2xl md:rounded-3xl border border-stone-200/90 hover:border-forest/50 p-1.5 sm:p-2.5 md:p-3 flex flex-col justify-between shadow-2xs hover:shadow-card interactive-card relative overflow-hidden cursor-pointer"
    >
      {/* 1. Product Image & Badges */}
      <Link href={productHref} className="block cursor-pointer">
        <div className="relative w-full aspect-square rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden bg-gradient-to-b from-[#FAF8F5] to-[#F3EEE5] border border-stone-100/90 mb-1.5 sm:mb-2.5 group/frame">
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            unoptimized={true}
            className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-108"
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.srcset = "";
              target.src = "/placeholder.png";
            }}
          />
          {/* Subtle light sweep shine on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

          {/* Floating Badges */}
          <div className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 flex flex-col gap-0.5 z-10">
            {product.organicCertified && (
              <span className="inline-flex items-center gap-0.5 px-1 sm:px-1.5 py-0.2 rounded-md bg-[#082613]/95 backdrop-blur-md text-emerald-300 text-[7px] sm:text-[8.5px] font-extrabold uppercase shadow-2xs border border-emerald-500/20">
                <Leaf className="w-2 h-2 text-emerald-400" />
                <span>{isBn ? "খাঁটি" : "Organic"}</span>
              </span>
            )}
            {product.featured && (
              <span className="inline-flex items-center gap-0.5 px-1 sm:px-1.5 py-0.2 rounded-md bg-amber-400 text-stone-950 text-[7px] sm:text-[8.5px] font-extrabold shadow-2xs">
                <Star className="w-2 h-2 fill-current" />
                <span>{isBn ? "সেরা" : "Top"}</span>
              </span>
            )}
          </div>

          {hasDiscount && (
            <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 z-10">
              <span className="px-1 sm:px-1.5 py-0.2 rounded bg-red-600 text-white text-[8px] sm:text-[10px] font-black tracking-tight shadow-xs">
                -{discountPercent}%
              </span>
            </div>
          )}

          {product.isCombo && (
            <div className="absolute bottom-1 left-1 sm:bottom-1.5 sm:left-1.5 z-10">
              <span className="px-1 sm:px-1.5 py-0.2 rounded bg-forest text-white text-[7.5px] sm:text-[8.5px] font-bold shadow-2xs">
                {isBn ? "কম্বো" : "Combo"}
              </span>
            </div>
          )}

          {/* Quick View Hover Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onQuickView) onQuickView(product);
              else router.push(productHref);
            }}
            title={isBn ? "এক নজরে দেখুন" : "Quick View"}
            className="absolute bottom-1.5 right-1.5 z-10 p-1.5 rounded-lg bg-white/95 hover:bg-white text-stone-700 hover:text-forest shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer hidden md:flex items-center justify-center hover:scale-105 border border-stone-200/80 active:scale-95"
            aria-label="Quick View"
          >
            <Eye className="w-3 h-3" />
          </button>
        </div>

        {/* 2. Category, Title & Unit */}
        <div className="space-y-0.5 sm:space-y-1">
          {product.category?.name && (
            <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider text-forest/90 block truncate">
              {product.category.name}
            </span>
          )}

          <h3 className="font-display font-bold text-[10.5px] sm:text-xs md:text-sm text-stone-900 group-hover:text-forest line-clamp-2 leading-snug min-h-[26px] sm:min-h-[32px] transition-colors">
            {product.name}
          </h3>

          <div className="flex items-center justify-between gap-0.5">
            {formattedUnit ? (
              <span className="text-[9px] sm:text-[11px] text-stone-500 font-medium truncate block">
                {formattedUnit}
              </span>
            ) : <span />}

            {product.stockQuantity > 0 && product.stockQuantity <= 5 && (
              <span className="text-[7.5px] sm:text-[8.5px] font-bold text-amber-900 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                {isBn ? `বাকি ${formatBengaliNumber(product.stockQuantity)}` : `${product.stockQuantity} left`}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* 3. Price & Action Bar */}
      <div className="pt-1.5 sm:pt-2 mt-1.5 border-t border-stone-100 space-y-1.5">
        {/* Price display & Per-Piece Price Tag */}
        <div className="flex items-center justify-between gap-0.5">
          <div className="flex items-baseline gap-1">
            <span className="text-xs sm:text-sm md:text-base font-extrabold font-mono text-forest leading-none">
              {formatTaka(effectivePrice)}
            </span>
            {hasDiscount && (
              <span className="text-[9px] sm:text-[10.5px] font-mono text-stone-400 line-through leading-none">
                {formatTaka(Number(product.price))}
              </span>
            )}
          </div>

          {(() => {
            let pieceCount = Number(product.unitQuantity) || 0;
            if (!pieceCount) {
              const match = (product.name || "").match(/(\d+)\s*পিস/);
              if (match) pieceCount = Number(match[1]);
            }
            if (pieceCount > 1) {
              const pPrice = (effectivePrice / pieceCount).toFixed(0);
              return (
                <span className="text-[7.5px] sm:text-[9px] font-bold text-amber-900 bg-amber-100/80 px-1 py-0.2 rounded border border-amber-300/80 font-mono shrink-0">
                  {isBn ? `৳${pPrice}/পিস` : `৳${pPrice}/pc`}
                </span>
              );
            }
            return null;
          })()}
        </div>

        {/* Dual Actions: Cart Icon + Express Order Button */}
        <div className="flex items-center gap-1">
          {/* Quick Cart Button */}
          <button
            type="button"
            onClick={handleQuickAdd}
            title={isBn ? "কার্টে যোগ করুন" : "Add to Cart"}
            className={`h-7 sm:h-8 w-7 sm:w-8 rounded-lg font-bold text-[10px] sm:text-xs flex items-center justify-center transition-all duration-200 cursor-pointer interactive-btn border shadow-2xs shrink-0 ${
              added
                ? "bg-emerald-600 text-white border-emerald-600 scale-105"
                : "bg-[#F8F6F2] hover:bg-forest/10 border-stone-200 hover:border-forest/40 text-stone-800"
            }`}
            aria-label="Add to cart"
          >
            {added ? (
              <Check className="w-3.5 h-3.5 text-white animate-bounce-slow" />
            ) : (
              <ShoppingBag className="w-3 h-3 text-forest group-hover:scale-110 transition-transform" />
            )}
          </button>

          {/* Express Order Button */}
          <button
            type="button"
            onClick={handleBuyNow}
            className="flex-1 h-7 sm:h-8 rounded-lg font-extrabold text-[9.5px] sm:text-[11px] bg-gradient-to-r from-forest via-forest-light to-forest hover:from-forest-deep hover:to-forest text-white flex items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer interactive-btn shadow-2xs hover:shadow-forest-glow relative overflow-hidden group/btn px-1"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 pointer-events-none" />
            <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 fill-amber-400 shrink-0" />
            <span className="truncate">{isBn ? "অর্ডার" : "Order"}</span>
          </button>
        </div>
      </div>

      {/* 1-Click Fast Checkout Modal */}
      {isQuickOrderOpen && (
        <QuickOrderModal
          product={product}
          isOpen={isQuickOrderOpen}
          onClose={() => setIsQuickOrderOpen(false)}
        />
      )}
    </div>
  );
}
