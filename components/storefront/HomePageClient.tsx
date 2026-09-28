"use client";
// components/storefront/HomePageClient.tsx - Ultra-Advanced World-Class Dynamic Storefront

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Leaf,
  ArrowRight,
  Sparkles,
  Flame,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Loader2,
  Truck,
  ShieldCheck,
  RotateCcw,
  Award,
  Zap,
  Star,
  Clock,
  CheckCircle2,
  Heart,
  Eye,
  MessageCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import StorefrontHeader from "@/components/storefront/Header";
import StorefrontFooter from "@/components/storefront/Footer";
import HeroSlider from "@/components/storefront/HeroSlider";
import ProductCard from "@/components/storefront/ProductCard";
import { ProductCardSkeleton } from "@/components/storefront/ProductCardSkeleton";
import { useLanguage } from "@/context/LanguageContext";
import { setCachedHomeData } from "@/lib/storeCache";

const QuickViewModal = dynamic(
  () => import("@/components/storefront/QuickViewModal"),
  { ssr: false }
);
const ComboDealsSlider = dynamic(
  () => import("@/components/storefront/ComboDealsSlider"),
  { ssr: false }
);

export default function HomePageClient({ initialData }: { initialData: any }) {
  const [data, setData] = useState<any>(initialData);
  const [loading, setLoading] = useState<boolean>(!initialData?.featuredProducts?.length);
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);
  const { locale } = useLanguage();
  const isBn = locale === "bn";

  useEffect(() => {
    // 1. If initialData is provided, display it immediately
    if (initialData?.featuredProducts?.length) {
      setData(initialData);
      setLoading(false);
    }

    // 2. Fresh fetch from live database API with cache: 'no-store'
    fetch("/api/storefront/home", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json);
        }
      })
      .catch((e) => console.error("Home sync error:", e))
      .finally(() => setLoading(false));
  }, [initialData]);

  const categories = data?.categories || [];
  const rawProducts = data?.featuredProducts || [];
  const productMap = new Map();
  rawProducts.forEach((p: any) => {
    if (p && p.id && !productMap.has(p.id)) productMap.set(p.id, p);
  });
  const products = Array.from(productMap.values());

  const rawCombos = data?.comboDeals || [];
  const comboMap = new Map();
  rawCombos.forEach((p: any) => {
    if (p && p.id && !comboMap.has(p.id)) comboMap.set(p.id, p);
  });
  const comboDeals = Array.from(comboMap.values());
  const banners = data?.banners || [];

  const filteredProducts = products;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col justify-between overflow-x-hidden selection:bg-forest selection:text-white">
      <StorefrontHeader />

      <main className="space-y-4 sm:space-y-8 pb-20 md:pb-16">
        <h1 className="sr-only">
          ENMAR — 100% Pure Organic Food & Pantry Essentials | খাঁটি অর্গানিক খাদ্য বাংলাদেশ
        </h1>

        {/* Dynamic Top Ad Banners or Brand Spotlight */}
        {banners && banners.length > 0 && (
          <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 pt-2 sm:pt-4">
            <HeroSlider banners={banners} />
          </div>
        )}


        {/* Main Product Showcase - Direct, Clean & Beautiful (No Middle Clutter) */}
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-4 pt-2">
          {/* Unified Section Header */}
          <div className="flex items-center justify-between border-b border-stone-200/90 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              <h2 className="text-base sm:text-2xl font-bold font-display text-stone-900">
                {isBn ? "আমাদের অর্গানিক পণ্যসমূহ" : "Our Organic Products"}
              </h2>
              {products.length > 0 && (
                <span className="text-[10px] sm:text-xs font-mono font-bold text-forest bg-forest/10 px-2.5 py-0.5 rounded-full border border-forest/20">
                  {products.length} {isBn ? "টি পণ্য" : "items"}
                </span>
              )}
            </div>

            <Link
              href="/products"
              className="text-xs sm:text-sm font-bold text-forest hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{isBn ? "সকল পণ্য দেখুন" : "View All"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* If Loading OR 0 products exist in DB: Show Loading Skeletons */}
          {loading || filteredProducts.length === 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-2 py-4 text-forest font-semibold text-xs sm:text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-forest" />
                <span>{isBn ? "পণ্য লোড হচ্ছে..." : "Loading products from database..."}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-3.5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            </div>
          ) : (
            /* Rendered Live DB Products - 3 side-by-side on mobile */
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-3.5">
              {filteredProducts.map((p: any) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onQuickView={(prod) => setQuickViewProduct(prod)}
                />
              ))}
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div className="text-center pt-4">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#843A02] via-[#A34E08] to-[#843A02] hover:from-[#5C2B04] hover:to-[#843A02] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-forest/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>{isBn ? "সকল পণ্য দেখুন" : "View All Products"}</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </Link>
            </div>
          )}
        </section>

        {/* 6. Family Combo & Bundle Deals (3-Item Side-by-Side Sliding Carousel) */}
        {comboDeals && comboDeals.length > 0 && (
          <ComboDealsSlider
            comboDeals={comboDeals}
            onQuickView={(prod) => setQuickViewProduct(prod)}
          />
        )}

      </main>

      {/* Quick View Product Modal */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}

      <StorefrontFooter />
    </div>
  );
}
