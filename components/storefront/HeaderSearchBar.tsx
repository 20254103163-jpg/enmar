"use client";
// components/storefront/HeaderSearchBar.tsx - World-Class Inline Header Search with Live Dropdown

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { formatTaka, getSafeImageUrl, getProductImages } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface HeaderSearchBarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function HeaderSearchBar({ isMobileOpen, onCloseMobile }: HeaderSearchBarProps) {
  const router = useRouter();
  const { locale } = useLanguage();
  const isBn = locale === "bn";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const quickKeywords = isBn
    ? [
        { label: "🫓 লাল আটার রুটি", query: "লাল আটা" },
        { label: "🥟 পাতা শেইপ মোমো", query: "মোমো" },
        { label: "🌯 চিকেন স্প্রিং রোল", query: "রোল" },
        { label: "🥐 খাস্তা সিঙ্গারা", query: "সিঙ্গারা" },
        { label: "🥟 ঝাল পুলি পিঠা", query: "পুলি পিঠা" },
        { label: "🎁 ফ্যামিলি মেগা কম্বো", query: "কম্বো" },
      ]
    : [
        { label: "🫓 Whole Wheat Roti", query: "Roti" },
        { label: "🥟 Chicken Momos", query: "Momo" },
        { label: "🌯 Chicken Rolls", query: "Roll" },
        { label: "🥐 Crispy Shingara", query: "Shingara" },
        { label: "🥟 Spicy Puli Pitha", query: "Puli Pitha" },
        { label: "🎁 Family Combo Box", query: "Combo" },
      ];

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Keyboard shortcut "/" or Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) &&
        document.activeElement !== inputRef.current &&
        !["INPUT", "TEXTAREA"].includes((document.activeElement as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
        if (onCloseMobile) onCloseMobile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCloseMobile]);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/storefront/products?search=${encodeURIComponent(query.trim())}&limit=6`)
        .then((res) => res.json())
        .then((data) => {
          if (data.products) {
            setResults(data.products);
          }
        })
        .catch((e) => console.error("Header search error:", e))
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
      if (onCloseMobile) onCloseMobile();
    }
  };

  const handleKeywordClick = (kwQuery: string) => {
    setQuery(kwQuery);
    router.push(`/products?search=${encodeURIComponent(kwQuery)}`);
    setIsOpen(false);
    if (onCloseMobile) onCloseMobile();
  };

  const handleItemClick = (slug: string) => {
    setIsOpen(false);
    if (onCloseMobile) onCloseMobile();
    router.push(`/products/${slug}`);
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-lg mx-2 sm:mx-4">
      {/* Search Input Bar */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="absolute left-3.5 pointer-events-none text-stone-400">
          <Search className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder={
            isBn
              ? "খাঁটি মধু, গাওয়া ঘি, সরিষার তেল, মসলা খুঁজুন... (টাইপ করুন বা / চাপুন)"
              : "Search pure honey, cow ghee, mustard oil, organic spices... (Press /)"
          }
          className="w-full pl-9 pr-10 py-2 sm:py-2.5 rounded-full bg-[#F8F6F2] hover:bg-stone-100 focus:bg-white text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 border border-stone-200/90 focus:border-forest/60 focus:ring-2 focus:ring-forest/15 transition-all outline-none shadow-2xs"
        />

        {/* Clear Button / Loading Spinner */}
        <div className="absolute right-3 flex items-center gap-1.5">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-forest" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold text-stone-400 bg-white border border-stone-200 rounded shadow-2xs">
              ⌘K
            </kbd>
          )}
        </div>
      </form>

      {/* Floating Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200/90 overflow-hidden z-50 animate-in fade-in-90 slide-in-from-top-2 duration-150 max-h-[80vh] flex flex-col">
          {/* Quick Keyword Pills (when query is short) */}
          {!query && (
            <div className="p-4 space-y-2.5 border-b border-stone-100 bg-[#FAF8F5]/80">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-forest" />
                <span>{isBn ? "জনপ্রিয় অনুসন্ধান ট্রেন্ড:" : "Trending Searches:"}</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickKeywords.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleKeywordClick(item.query)}
                    className="px-3 py-1.5 rounded-full bg-white border border-stone-200 text-stone-700 hover:border-forest hover:text-forest text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results List */}
          {query.trim() && (
            <div className="overflow-y-auto max-h-[360px] p-2 space-y-1">
              {loading ? (
                <div className="py-8 flex flex-col items-center justify-center text-stone-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-forest" />
                  <span className="text-xs font-medium">{isBn ? "পণ্য খোঁজা হচ্ছে..." : "Searching products..."}</span>
                </div>
              ) : results.length > 0 ? (
                results.map((product) => {
                  const images = getProductImages(product.images);
                  const imageSrc = images[0] ? getSafeImageUrl(images[0]) : "/placeholder.png";
                  const price = Number(product.discountPrice || product.price);
                  const slug = product.slug || String(product.id);

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleItemClick(slug)}
                      className="flex items-center gap-3 p-2.5 hover:bg-[#FAF8F5] rounded-2xl transition-colors cursor-pointer group"
                    >
                      <div className="relative w-12 h-12 rounded-xl bg-stone-100 border border-stone-200/80 overflow-hidden shrink-0">
                        <Image
                          src={imageSrc}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        {product.category?.name && (
                          <span className="text-[10px] font-bold text-forest uppercase tracking-wider block truncate">
                            {product.category.name}
                          </span>
                        )}
                        <h4 className="font-display font-bold text-xs text-stone-900 group-hover:text-forest truncate">
                          {product.name}
                        </h4>
                        <span className="font-mono font-extrabold text-xs text-forest">
                          {formatTaka(price)}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-forest group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-stone-500 space-y-1">
                  <p className="text-xs font-semibold">
                    {isBn ? "কোনো পণ্য পাওয়া যায়নি" : "No products found"}
                  </p>
                  <p className="text-[11px] text-stone-400">
                    {isBn ? `"${query}" এর জন্য অন্য কিছু লিখে খুঁজুন` : "Try searching with different keywords"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer: View All Results Button */}
          {query.trim() && results.length > 0 && (
            <div className="p-2.5 bg-[#FAF8F5] border-t border-stone-100 text-center">
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full py-2 px-4 rounded-xl bg-forest hover:bg-forest/90 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>{isBn ? `"${query}" এর সকল ফলাফল দেখুন` : `View all results for "${query}"`}</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
