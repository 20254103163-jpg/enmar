"use client";
// components/storefront/Header.tsx - Ultra-Sleek Modern Luxury Header

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Search,
  Menu,
  X,
  Phone,
  User,
  ShieldCheck,
  LayoutDashboard,
  Sparkles,
  ChevronRight,
  Flame,
  Truck,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useStorefront } from "@/context/StorefrontContext";
import LanguageToggle from "./LanguageToggle";
import HeaderSearchBar from "./HeaderSearchBar";
import { getSafeImageUrl } from "@/lib/utils";

export default function StorefrontHeader() {
  const router = useRouter();
  const { cartCount, setIsCartOpen } = useCart();
  const { locale } = useLanguage();
  const { user: customer, isStaff } = useAuth();
  const { settings: siteSettings, categories: navCategories } = useStorefront();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [cartAnimate, setCartAnimate] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Trigger cart bounce when cartCount changes
  useEffect(() => {
    if (cartCount > 0) {
      setCartAnimate(true);
      const t = setTimeout(() => setCartAnimate(false), 650);
      return () => clearTimeout(t);
    }
  }, [cartCount]);

  const brandTitle = siteSettings.brandName || "ENMAR";
  const brandSub = siteSettings.brandTagline || "";

  return (
    <header className={`sticky top-0 z-40 w-full transition-all duration-300 ${
      scrolled
        ? "bg-white/95 backdrop-blur-xl border-b border-stone-200/90 shadow-sm"
        : "bg-white/90 backdrop-blur-md border-b border-stone-200/70 shadow-xs"
    }`}>
      {/* 1. Desktop Top Announcement Bar */}
      {(siteSettings.contactPhone || isStaff || brandSub) && (
        <div className="hidden sm:block bg-gradient-to-r from-[#1F0E03] via-[#843A02] to-[#1F0E03] text-white text-xs py-1 px-4 border-b border-amber-950/40">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-medium truncate text-[11px] text-amber-100/95">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              {brandSub ? (
                <span suppressHydrationWarning className="truncate">{brandSub}</span>
              ) : (
                <span className="truncate">১০০% খাঁটি ও প্রাকৃতিক প্রিমিয়াম অর্গানিক খাদ্যপণ্য • দ্রুত হোম ডেলিভারি</span>
              )}
            </div>

            <div className="flex items-center gap-4 text-white/90 text-[11px] shrink-0">
              {isStaff && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-extrabold tracking-wide hover:bg-amber-300 transition-all shadow-xs"
                >
                  <LayoutDashboard className="w-3 h-3 text-stone-950" />
                  <span>{locale === "bn" ? "অ্যাডমিন প্যানেল" : "Admin Panel"}</span>
                </Link>
              )}

              {siteSettings.contactPhone && (
                <a
                  href={`tel:${siteSettings.contactPhone}`}
                  className="hidden sm:flex items-center gap-1.5 hover:text-amber-300 transition-colors font-semibold"
                >
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>{siteSettings.contactPhone}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Menu Drawer Trigger & Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-2xl text-stone-700 hover:text-stone-950 lg:hidden border border-stone-200/90 cursor-pointer active:scale-90 bg-[#FBF4EA] hover:bg-white transition-all shadow-2xs"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5 text-forest" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2.5 group min-h-[38px]">
            {siteSettings.siteLogo ? (
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shadow-xs shrink-0 ring-2 ring-[#843A02]/30 group-hover:scale-105 transition-transform duration-300 bg-white">
                <Image
                  src={getSafeImageUrl(siteSettings.siteLogo)}
                  alt={brandTitle || "Logo"}
                  fill
                  className="object-cover"
                  sizes="40px"
                  priority
                />
              </div>
            ) : null}
            <div className="flex flex-col justify-center">
              {brandTitle ? (
                <span suppressHydrationWarning className="font-extrabold text-lg sm:text-2xl tracking-tight text-[#843A02] leading-none truncate max-w-[140px] sm:max-w-xs font-display group-hover:text-forest-light transition-colors">
                  {brandTitle}
                </span>
              ) : (
                <div className="w-24 sm:w-32 h-5 bg-stone-200/70 rounded-md animate-pulse" />
              )}
              {brandSub ? (
                <span suppressHydrationWarning className="hidden sm:block text-[11px] text-stone-500 font-medium mt-0.5 truncate max-w-xs leading-tight">
                  {brandSub}
                </span>
              ) : null}
            </div>
          </Link>
        </div>

        {/* Center: Live Inline Search Bar (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-lg mx-4">
          <HeaderSearchBar />
        </div>

        {/* Right: Actions (Language, Search, Cart, Account) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Mobile Search Toggle Icon */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="p-2 rounded-2xl text-stone-700 hover:text-stone-900 md:hidden border border-stone-200/90 bg-[#FBF4EA] hover:bg-white cursor-pointer active:scale-90 transition-all shadow-2xs"
            aria-label="Search"
          >
            {mobileSearchOpen ? <X className="w-4 h-4 text-forest" /> : <Search className="w-4 h-4" />}
          </button>

          <LanguageToggle />

          {/* Admin badge (if logged in staff) */}
          {isStaff && (
            <Link
              href="/admin"
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-2xl bg-amber-100/90 hover:bg-amber-200 border border-amber-300/80 text-amber-950 flex items-center gap-1 text-[11px] sm:text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-800" />
              <span className="hidden sm:inline">
                {locale === "bn" ? "অ্যাডমিন" : "Admin"}
              </span>
            </Link>
          )}

          {/* Desktop Account Link */}
          <Link
            href={customer ? "/account/profile" : "/auth/login"}
            className="hidden sm:flex p-2 sm:px-3.5 sm:py-2 rounded-2xl border border-stone-200/90 hover:border-forest/40 bg-[#FBF4EA] hover:bg-white text-stone-800 items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <User className="w-4 h-4 text-forest" />
            <span>
              {customer ? customer.name.split(" ")[0] : (locale === "bn" ? "লগইন" : "Login")}
            </span>
          </Link>

          {/* Header Cart Button */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className={`relative flex items-center gap-1.5 bg-gradient-to-r from-[#843A02] via-[#A34E08] to-[#843A02] hover:from-[#5C2B04] hover:to-[#843A02] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl font-bold text-xs transition-all shadow-sm hover:shadow-forest-glow cursor-pointer active:scale-95 shrink-0 ${
              cartAnimate ? "scale-105 ring-2 ring-amber-400" : ""
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline font-bold">{locale === "bn" ? "কার্ট" : "Cart"}</span>
            <span className={`min-w-4.5 h-4.5 sm:min-w-5 sm:h-5 px-1 rounded-full bg-amber-400 text-stone-950 text-[10px] sm:text-[11px] font-black flex items-center justify-center transition-transform ${
              cartAnimate ? "scale-125 bg-amber-300" : ""
            }`}>
              {cartCount}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Search Dropdown Bar */}
      {mobileSearchOpen && (
        <div className="md:hidden px-3 py-3 bg-white border-b border-stone-200 animate-in slide-in-from-top-2 duration-150">
          <HeaderSearchBar isMobileOpen={true} onCloseMobile={() => setMobileSearchOpen(false)} />
        </div>
      )}

      {/* 3. Desktop Sub-Navigation Menu */}
      <nav className="hidden lg:block border-t border-stone-200/70 bg-[#FAF8F5]/90">
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-center gap-6 py-2">
          <Link
            href="/products"
            className="text-xs font-bold text-stone-700 hover:text-forest transition-colors py-1 cursor-pointer hover:-translate-y-0.5"
          >
            {locale === "bn" ? "সকল পণ্য" : "All Products"}
          </Link>

          {navCategories.map((c: any) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              className="text-xs font-semibold text-stone-600 hover:text-forest transition-all py-1 cursor-pointer hover:-translate-y-0.5"
            >
              {c.name}
            </Link>
          ))}

          <Link
            href="/subscription"
            className="text-xs font-semibold text-stone-600 hover:text-forest transition-all py-1 cursor-pointer hover:-translate-y-0.5"
          >
            {locale === "bn" ? "সাবস্ক্রিপশন বক্স" : "Subscriptions"}
          </Link>

          <Link
            href="/recipes"
            className="text-xs font-semibold text-stone-600 hover:text-forest transition-all py-1 cursor-pointer hover:-translate-y-0.5"
          >
            {locale === "bn" ? "রেসিপি ও টিপস" : "Recipes"}
          </Link>

          <Link
            href="/track"
            className="text-xs font-semibold text-stone-600 hover:text-forest transition-all py-1 cursor-pointer flex items-center gap-1 hover:-translate-y-0.5"
          >
            <Truck className="w-3.5 h-3.5 text-forest" />
            <span>{locale === "bn" ? "অর্ডার ট্র্যাকিং" : "Track Order"}</span>
          </Link>
        </div>
      </nav>

      {/* 4. Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-white px-4 py-4 space-y-3 animate-in slide-in-from-top-2 shadow-xl">
          <nav className="flex flex-col space-y-2 text-xs font-medium text-stone-700">
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 border-b border-stone-100 font-bold text-forest flex items-center justify-between"
            >
              <span>{locale === "bn" ? "সকল পণ্য দেখুন" : "All Products"}</span>
              <ChevronRight className="w-4 h-4 text-forest" />
            </Link>


            {navCategories.map((c: any) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 border-b border-stone-100 flex items-center justify-between"
              >
                <span>{c.name}</span>
                <span className="text-stone-400">›</span>
              </Link>
            ))}
            <Link
              href="/subscription"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-stone-100 flex items-center justify-between"
            >
              <span>{locale === "bn" ? "সাবস্ক্রিপশন বক্স" : "Subscriptions"}</span>
              <span className="text-stone-400">›</span>
            </Link>
            <Link
              href="/recipes"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-stone-100 flex items-center justify-between"
            >
              <span>{locale === "bn" ? "রেসিপি ও টিপস" : "Recipes"}</span>
              <span className="text-stone-400">›</span>
            </Link>
            <Link
              href="/track"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 flex items-center justify-between font-semibold text-stone-800"
            >
              <span>{locale === "bn" ? "অর্ডার ট্র্যাকিং" : "Track Order"}</span>
              <span className="text-stone-400">›</span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
