"use client";

import BrandLoader from "@/components/ui/BrandLoader";
// app/products/page.tsx

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Filter,
  Leaf,
  Loader2,
  SlidersHorizontal,
  X,
  RotateCcw,
} from "lucide-react";
import StorefrontHeader from "@/components/storefront/Header";
import StorefrontFooter from "@/components/storefront/Footer";
import ProductCard from "@/components/storefront/ProductCard";
import { ProductCardSkeleton } from "@/components/storefront/ProductCardSkeleton";
import { useLanguage } from "@/context/LanguageContext";
import { formatBengaliNumber } from "@/lib/utils";

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  const initialSearch = searchParams.get("search") || "";

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  }>({
    total: 0,
    page: 1,
    limit: 24,
    totalPages: 1,
    hasMore: false,
  });

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [organicOnly, setOrganicOnly] = useState<boolean>(false);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("featured");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const { t, locale } = useLanguage();

  // Sync category state when URL searchParams changes
  useEffect(() => {
    const currentCat = searchParams.get("category") || "all";
    setSelectedCategory(currentCat);
  }, [searchParams]);

  useEffect(() => {
    try {
      const catCache = localStorage.getItem("enmar_categories_cache");
      if (catCache) {
        setCategories(JSON.parse(catCache));
      }
    } catch (e) {}

    fetch("/api/storefront/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) {
          setCategories(data.categories);
          try {
            localStorage.setItem("enmar_categories_cache", JSON.stringify(data.categories));
          } catch (e) {}
        }
      })
      .catch((e) => console.error(e));
  }, []);

  const buildQueryParams = (pageNum: number) => {
    const params = new URLSearchParams();
    if (selectedCategory && selectedCategory !== "all") {
      params.append("category", selectedCategory);
    }
    if (initialSearch) {
      params.append("search", initialSearch);
    }
    if (minPrice) params.append("minPrice", minPrice);
    if (maxPrice) params.append("maxPrice", maxPrice);
    if (organicOnly) params.append("organicOnly", "true");
    if (inStockOnly) params.append("inStockOnly", "true");
    if (sortBy) params.append("sort", sortBy);
    params.append("page", pageNum.toString());
    params.append("limit", "24");
    return params.toString();
  };

  useEffect(() => {
    setLoading(true);
    const queryString = buildQueryParams(1);

    fetch(`/api/storefront/products?${queryString}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.products) {
          const map = new Map();
          data.products.forEach((p: any) => {
            if (p && p.id && !map.has(p.id)) map.set(p.id, p);
          });
          setProducts(Array.from(map.values()));
          if (data.pagination) setPagination(data.pagination);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [
    selectedCategory,
    initialSearch,
    minPrice,
    maxPrice,
    organicOnly,
    inStockOnly,
    sortBy,
  ]);

  const handleLoadMore = () => {
    if (!pagination.hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = pagination.page + 1;
    const queryString = buildQueryParams(nextPage);

    fetch(`/api/storefront/products?${queryString}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.products) {
          setProducts((prev) => {
            const map = new Map();
            prev.forEach((p: any) => {
              if (p && p.id) map.set(p.id, p);
            });
            data.products.forEach((p: any) => {
              if (p && p.id && !map.has(p.id)) map.set(p.id, p);
            });
            return Array.from(map.values());
          });
          if (data.pagination) setPagination(data.pagination);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoadingMore(false));
  };

  const handleCategorySelect = (slug: string) => {
    setSelectedCategory(slug);
    setMobileFilterOpen(false);
  };

  const handleReset = () => {
    setSelectedCategory("all");
    setMinPrice("");
    setMaxPrice("");
    setOrganicOnly(false);
    setInStockOnly(false);
    setSortBy("featured");
  };

  const hasActiveFilters =
    selectedCategory !== "all" ||
    minPrice !== "" ||
    maxPrice !== "" ||
    organicOnly ||
    inStockOnly;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col justify-between">
      <StorefrontHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1 w-full">
        {/* Page Header Banner */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-stone-900">
              {initialSearch
                ? `${t("catalog.loading")} "${initialSearch}"`
                : t("nav.allProducts")}
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              {loading
                ? t("catalog.loading")
                : t("catalog.showing", {
                    count: locale === "bn"
                      ? formatBengaliNumber(pagination.total || products.length)
                      : (pagination.total || products.length),
                  })}
            </p>
          </div>

          {/* Sort & Mobile Filter Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl bg-forest text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>{t("catalog.filter")}</span>
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-800 focus:outline-none focus:border-forest cursor-pointer"
            >
              <option value="featured">{t("catalog.sortPopular")}</option>
              <option value="newest">{t("catalog.sortNewest")}</option>
              <option value="price_asc">{t("catalog.sortPriceAsc")}</option>
              <option value="price_desc">{t("catalog.sortPriceDesc")}</option>
            </select>
          </div>
        </div>

        {/* Layout: Sidebar Filter + Products Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6 sticky top-24">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-forest" />
                <h3 className="font-bold text-sm text-stone-900">{t("catalog.filter")}</h3>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 text-[11px] text-forest hover:underline font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t("catalog.reset")}</span>
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                {t("catalog.categories")}
              </label>
              <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => handleCategorySelect("all")}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    selectedCategory === "all"
                      ? "bg-forest text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  <span>{t("catalog.allCategories")}</span>
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategorySelect(c.slug)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      selectedCategory === c.slug
                        ? "bg-forest text-white font-bold"
                        : "text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="text-[10px] opacity-70 ml-1">({c._count?.products || 0})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="space-y-2 pt-4 border-t border-stone-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                {t("catalog.priceRange")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs font-mono"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs font-mono"
                />
              </div>
            </div>

            {/* Checkbox Toggles */}
            <div className="space-y-2.5 pt-4 border-t border-stone-200">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-stone-800">
                <input
                  type="checkbox"
                  checked={organicOnly}
                  onChange={(e) => setOrganicOnly(e.target.checked)}
                  className="w-4 h-4 text-forest rounded"
                />
                <span className="flex items-center gap-1">
                  <Leaf className="w-3.5 h-3.5 text-forest" />
                  {t("catalog.organicOnly")}
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-stone-800">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 text-forest rounded"
                />
                <span>{t("catalog.inStockOnly")}</span>
              </label>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="lg:col-span-3">
            {loading && products.length === 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : !loading && products.length === 0 ? (
              <div className="py-20 text-center text-stone-500 bg-white rounded-2xl border border-stone-200 p-8 space-y-3">
                <Leaf className="w-10 h-10 text-stone-300 mx-auto" />
                <h3 className="text-lg font-bold font-display text-stone-900">
                  {locale === "bn" ? "কোনো পণ্য পাওয়া যায়নি" : "No products found"}
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  {locale === "bn"
                    ? "অনুগ্রহ করে ফিল্টার রিসেট করুন অথবা অন্য কোনো ক্যাটাগরি বাছাই করুন।"
                    : "Try resetting filters or adjusting your price range."}
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2 rounded-xl bg-forest text-white text-xs font-semibold cursor-pointer shadow-xs hover:bg-forest-deep transition-all"
                >
                  {t("catalog.reset")}
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-4">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>

                {pagination.hasMore && (
                  <div className="text-center pt-4">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-forest hover:bg-forest-deep text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{locale === "bn" ? "লোড হচ্ছে..." : "Loading more..."}</span>
                        </>
                      ) : (
                        <span>{locale === "bn" ? "আরও পণ্য দেখুন" : "Load More Products"}</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Slide-Up Filter Sheet */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setMobileFilterOpen(false)}
            />
            <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl p-6 space-y-6 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h3 className="font-bold font-display text-lg text-stone-900">{t("catalog.filter")}</h3>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 rounded-lg text-stone-500 hover:text-stone-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                  {t("catalog.categories")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCategorySelect("all")}
                    className={`px-3 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                      selectedCategory === "all" ? "bg-forest text-white" : "bg-stone-100 text-stone-800"
                    }`}
                  >
                    {t("catalog.allCategories")}
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCategorySelect(c.slug)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium truncate cursor-pointer ${
                        selectedCategory === c.slug ? "bg-forest text-white" : "bg-stone-100 text-stone-800"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    handleReset();
                    setMobileFilterOpen(false);
                  }}
                  className="w-1/3 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  {locale === "bn" ? "রিসেট" : "Reset"}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-2/3 py-3 rounded-xl bg-forest hover:bg-forest-deep text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {locale === "bn" ? "ফিল্টার প্রয়োগ করুন" : "Apply Filters"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <StorefrontFooter />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] text-forest font-medium">
          Loading catalog...
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
