"use client";
// components/storefront/SearchSpotlightModal.tsx - Instant Keyboard-Friendly Search Spotlight

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, ShoppingBag, ArrowRight, Leaf, Sparkles, Loader2 } from "lucide-react";
import { formatTaka, getSafeImageUrl, getProductImages } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface SearchSpotlightModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchSpotlightModal({ isOpen, onClose }: SearchSpotlightModalProps) {
  const router = useRouter();
  const { locale } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isBn = locale === "bn";

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

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
        .catch((e) => console.error("Search error:", e))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-24">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-stone-200/90 overflow-hidden z-10 animate-in fade-in-90 slide-in-from-top-4 duration-200">
        {/* Search Input Bar */}
        <form onSubmit={handleSubmit} className="relative flex items-center p-4 border-b border-stone-100">
          <Search className="w-5 h-5 text-forest shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            placeholder={isBn ? "খাঁটি মধু, সরিষার তেল, ঘি, মসলা খুঁজুন..." : "Search organic foods, honey, ghee..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none bg-transparent"
          />
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-forest shrink-0 mr-2" />
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 text-stone-400 hover:text-stone-700 mr-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-stone-500 hover:text-stone-900 px-2 py-1 bg-stone-100 rounded-lg cursor-pointer"
          >
            ESC
          </button>
        </form>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 divide-y divide-stone-100">
          {query.trim() && !loading && results.length === 0 ? (
            <div className="text-center py-8 text-stone-500 space-y-1">
              <Leaf className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-xs font-semibold">{isBn ? "কোনো পণ্য পাওয়া যায়নি" : "No products found"}</p>
            </div>
          ) : results.length > 0 ? (
            results.map((product) => {
              const images = getProductImages(product.images);
              const imageSrc = images[0] ? getSafeImageUrl(images[0]) : "/placeholder.png";
              const price = Number(product.discountPrice || product.price);

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug || product.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-2.5 hover:bg-[#FAF8F5] rounded-2xl transition-colors cursor-pointer group"
                >
                  <div className="relative w-12 h-12 rounded-xl bg-gradient-to-b from-[#FAF8F5] to-[#F4EFEB] border border-stone-200/80 overflow-hidden shrink-0 flex items-center justify-center p-1 shadow-xs">
                    <Image src={imageSrc} alt={product.name} fill unoptimized={true} className="object-contain p-0.5 drop-shadow-xs" sizes="48px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display font-bold text-xs text-stone-900 group-hover:text-forest truncate">
                      {product.name}
                    </h4>
                    <span className="font-mono font-extrabold text-xs text-forest">
                      {formatTaka(price)}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-forest group-hover:translate-x-0.5 transition-transform" />
                </Link>
              );
            })
          ) : (
            <div className="py-4 px-2 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                {isBn ? "জনপ্রিয় অনুসন্ধান:" : "Popular Searches:"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: "খাঁটি মধু", query: "মধু" },
                  { name: "সরিষার তেল", query: "তেল" },
                  { name: "গাওয়া ঘি", query: "ঘি" },
                  { name: "কম্বো অফার", query: "কম্বো" },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setQuery(item.query)}
                    className="px-3 py-1 rounded-full bg-stone-100 hover:bg-forest/10 hover:text-forest text-stone-700 text-xs font-medium transition-colors cursor-pointer"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer View All Search Results */}
        {query.trim() && (
          <div className="p-3 bg-stone-50 border-t border-stone-100 text-center">
            <button
              type="button"
              onClick={handleSubmit}
              className="text-xs font-bold text-forest hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{isBn ? `"${query}" এর সকল ফলাফল দেখুন` : `View all results for "${query}"`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
