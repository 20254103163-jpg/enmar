"use client";
// components/storefront/Footer.tsx - Clean 100% Dynamic Footer with Payment & Trust Badges

import Link from "next/link";
import Image from "next/image";
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Truck,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useStorefront } from "@/context/StorefrontContext";
import { getSafeImageUrl } from "@/lib/utils";

export default function StorefrontFooter() {
  const { locale } = useLanguage();
  const { settings, categories } = useStorefront();
  const isBn = locale === "bn";

  const brandTitle = settings.brandName || "ENMAR";

  return (
    <footer className="bg-[#140802] text-stone-300 border-t border-[#843A02]/40 selection:bg-amber-400 selection:text-stone-950">
      {/* pb-32 on mobile to guarantee clear distance above floating buttons & bottom nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-32 sm:pb-10">
        {/* Main Grid: 1 col on mobile for Brand, then 2-cols for quick links, or 4-cols on lg */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 sm:gap-8 pb-8 border-b border-white/10">
          {/* Column 1: Brand Info & WhatsApp (Lg 4 Cols) */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-3.5">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              {settings.siteLogo ? (
                <div className="relative w-9 h-9 rounded-full overflow-hidden shadow-sm shrink-0 ring-2 ring-amber-400/40 bg-white">
                  <Image
                    src={getSafeImageUrl(settings.siteLogo)}
                    alt={brandTitle}
                    fill
                    className="object-cover"
                    sizes="36px"
                  />
                </div>
              ) : null}
              <div>
                <span className="font-display font-extrabold text-xl sm:text-2xl tracking-tight text-white leading-none block group-hover:text-amber-300 transition-colors">
                  {brandTitle}
                </span>
                <span className="block text-[11px] font-medium text-amber-300/90 tracking-wide mt-0.5">
                  {settings.brandTagline || "100% Pure Organic Food"}
                </span>
              </div>
            </Link>

            <p className="text-[11.5px] sm:text-xs text-stone-400 leading-relaxed max-w-sm">
              {isBn
                ? "১০০% খাঁটি ও প্রাকৃতিক প্রিমিয়াম অর্গানিক খাদ্যপণ্য। সুন্দরবনের কাঁচা মধু, খাঁটি গাওয়া ঘি, ঘানিভাঙা সরিষার তেল ও বাছাইকৃত পুষ্টিকর অর্গানিক পণ্য আপনার ঘরে পৌঁছে দিচ্ছি।"
                : "100% pure and natural premium organic foods. Delivering raw honey, cow ghee, cold-pressed oils, and certified organic health foods to your doorstep."}
            </p>

            {settings.whatsappNumber && (
              <div className="pt-1">
                <a
                  href={`https://wa.me/${settings.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95 hover:shadow-emerald-600/30"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{isBn ? "হোয়াটসঅ্যাপে অর্ডার ও সহায়তা" : "WhatsApp Support"}</span>
                </a>
              </div>
            )}
          </div>

          {/* Quick Links Section (2 Columns on mobile: Categories & Customer Care) */}
          <div className="sm:col-span-2 lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-6">
            {/* Column 2: Quick Shop Categories */}
            <div className="space-y-2.5">
              <h3 className="text-[11.5px] sm:text-xs font-bold text-amber-400 font-display uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{isBn ? "ক্যাটাগরি" : "Categories"}</span>
              </h3>
              <ul className="space-y-1.5 text-[11.5px] sm:text-xs text-stone-400">
                <li>
                  <Link href="/products" className="hover:text-amber-300 transition-colors block py-0.5 truncate">
                    {isBn ? "সকল পণ্য" : "All Products"}
                  </Link>
                </li>
                {categories.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/products?category=${c.slug}`}
                      className="hover:text-amber-300 transition-colors block py-0.5 truncate"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Customer Care & Policies */}
            <div className="space-y-2.5">
              <h3 className="text-[11.5px] sm:text-xs font-bold text-amber-400 font-display uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>{isBn ? "গ্রাহক সেবা" : "Support"}</span>
              </h3>
              <ul className="space-y-1.5 text-[11.5px] sm:text-xs text-stone-400">
                <li>
                  <Link href="/track" className="hover:text-amber-300 transition-colors flex items-center gap-1 py-0.5">
                    <Truck className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{isBn ? "অর্ডার ট্র্যাকিং" : "Track Order"}</span>
                  </Link>
                </li>
                <li>
                  <Link href="/shipping" className="hover:text-amber-300 transition-colors block py-0.5">
                    {isBn ? "ডেলিভারি চার্জ" : "Shipping"}
                  </Link>
                </li>
                <li>
                  <Link href="/returns" className="hover:text-amber-300 transition-colors flex items-center gap-1 py-0.5">
                    <RotateCcw className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{isBn ? "রিটার্ন পলিসি" : "Returns"}</span>
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-amber-300 transition-colors block py-0.5">
                    {isBn ? "প্রাইভেসি পলিসি" : "Privacy Policy"}
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-amber-300 transition-colors block py-0.5">
                    {isBn ? "শর্তাবলী" : "Terms"}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact & Office */}
            <div className="col-span-2 sm:col-span-1 space-y-2.5">
              <h3 className="text-[11.5px] sm:text-xs font-bold text-amber-400 font-display uppercase tracking-wider">
                {isBn ? "যোগাযোগ ও ঠিকানা" : "Contact & Info"}
              </h3>
              <div className="space-y-2 text-[11.5px] sm:text-xs text-stone-400">
                {settings.contactPhone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <a href={`tel:${settings.contactPhone}`} className="hover:text-amber-300 font-mono">
                      {settings.contactPhone}
                    </a>
                  </div>
                )}
                {settings.contactEmail && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <a href={`mailto:${settings.contactEmail}`} className="hover:text-amber-300 truncate font-mono text-[11px]">
                      {settings.contactEmail}
                    </a>
                  </div>
                )}
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{settings.contactAddress || "ঢাকা, বাংলাদেশ"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Payment Logos & Copyright */}
        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] sm:text-xs text-stone-400">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} {brandTitle}. {isBn ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}
          </p>

          <div className="flex items-center gap-2">
            <span className="text-[10.5px] text-stone-400 font-semibold">
              {isBn ? "নিরাপদ পেমেন্ট:" : "Payments:"}
            </span>
            <div className="flex items-center gap-2 bg-black/40 px-2.5 py-1 rounded-xl border border-white/10 text-[10.5px]">
              <span className="font-bold text-pink-400">bKash</span>
              <span className="text-stone-600">|</span>
              <span className="font-bold text-amber-400">Nagad</span>
              <span className="text-stone-600">|</span>
              <span className="font-bold text-emerald-400">COD</span>
              <span className="text-stone-600">|</span>
              <span className="font-bold text-sky-400">Cards</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
