"use client";
// components/storefront/ProductDetailClient.tsx - Instant Zero-Latency Product Detail View

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Plus,
  Minus,
  Star,
  Leaf,
  ShieldCheck,
  Truck,
  ArrowRight,
  Share2,
  Check,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Zap,
  X,
  FileText,
  Camera,
  MessageCircle,
} from "lucide-react";
import StorefrontHeader from "@/components/storefront/Header";
import StorefrontFooter from "@/components/storefront/Footer";
import ProductCard from "@/components/storefront/ProductCard";
import QuickOrderModal from "@/components/storefront/QuickOrderModal";
import { formatTaka, getProductImages, getSafeImageUrl, formatProductUnit, formatBengaliNumber } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { useStorefront } from "@/context/StorefrontContext";

export default function ProductDetailClient({
  initialProduct,
  initialRelated = [],
  slug,
}: {
  initialProduct: any;
  initialRelated?: any[];
  slug: string;
}) {
  const router = useRouter();
  const { addToCart, setIsCartOpen } = useCart();
  const { t, locale } = useLanguage();
  const { settings } = useStorefront();

  const [product, setProduct] = useState<any>(initialProduct);
  const [related, setRelated] = useState<any[]>(initialRelated);
  const [loading, setLoading] = useState<boolean>(!initialProduct);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);
  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);

  // Advantage states: Lab report modal & Photo reviews
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [labModalOpen, setLabModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    userName: "",
    rating: 5,
    comment: "",
    photos: [] as string[],
    photoInput: "",
  });

  useEffect(() => {
    if (!slug) return;
    // Background SWR sync for real-time stock/price accuracy
    fetch(`/api/storefront/products/${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.product) {
          setProduct(data.product);
          if (data.related) setRelated(data.related);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (product?.id) {
      fetch(`/api/storefront/reviews?productId=${product.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.reviews) {
            setReviewsList(data.reviews);
          }
        })
        .catch(() => {});
    }
  }, [product?.id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product?.id || !reviewForm.userName.trim() || !reviewForm.comment.trim()) return;

    setSubmittingReview(true);
    try {
      const res = await fetch("/api/storefront/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          userName: reviewForm.userName.trim(),
          rating: reviewForm.rating,
          comment: reviewForm.comment.trim(),
          photos: reviewForm.photos,
        }),
      });
      const data = await res.json();
      if (data.success && data.review) {
        setReviewsList((prev) => [data.review, ...prev]);
        setReviewModalOpen(false);
        setReviewForm({ userName: "", rating: 5, comment: "", photos: [], photoInput: "" });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!product && loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between">
        <StorefrontHeader />
        <div className="py-24 text-center text-stone-500 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-stone-200/80 animate-pulse mx-auto" />
          <p className="text-xs font-semibold">{locale === "bn" ? "পণ্য লোড হচ্ছে..." : "Loading product details..."}</p>
        </div>
        <StorefrontFooter />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between">
        <StorefrontHeader />
        <div className="max-w-xl mx-auto py-24 text-center px-4 space-y-4">
          <h2 className="text-xl font-bold font-display text-stone-900">
            {locale === "bn" ? "পণ্যটি পাওয়া যায়নি" : "Product Not Found"}
          </h2>
          <p className="text-xs text-stone-600">
            {locale === "bn"
              ? "আপনি যে পণ্যটি খুঁজছেন তা বর্তমানে অনুপলব্ধ অথবা সরানো হয়েছে।"
              : "The product you requested does not exist or has been removed."}
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest text-white text-xs font-semibold hover:bg-forest-deep transition-all shadow-xs"
          >
            <span>{locale === "bn" ? "সবগুলো পণ্য দেখুন" : "View All Products"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <StorefrontFooter />
      </div>
    );
  }

  const images = getProductImages(product.images);
  const activeImage = images[activeImageIndex] || images[0];

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

  const isOutOfStock = Number(product.stockQuantity) <= 0;
  const isLowStock =
    Number(product.stockQuantity) > 0 && Number(product.stockQuantity) <= 5;
  const formattedUnit = formatProductUnit(product.unitQuantity, product.unit);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    setIsQuickOrderOpen(true);
  };

  const handleWhatsAppOrder = () => {
    const rawPhone = settings?.whatsappNumber || settings?.contactPhone || "01700000000";
    let cleanPhone = rawPhone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "88" + cleanPhone;

    const unitPrice = Number(product.discountPrice || product.price);
    const totalPrice = unitPrice * quantity;
    const prodUrl = typeof window !== "undefined" ? window.location.href : "";

    const msg = `আসসালামু আলাইকুম! 🌿\nআমি ENMAR থেকে এই পণ্যটি সরাসরি অর্ডার করতে চাই:\n\n📦 পণ্য: ${product.name}\n🔢 পরিমাণ: ${quantity} ${product.unit || "টি"}\n💰 মূল্য: ৳${totalPrice}\n🔗 লিংক: ${prodUrl}\n\nআমার ডেলিভারির জন্য আপনার সাথে যোগাযোগ করতে চাই।`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.shortDescription || `${product.name} - ENMAR Organic Food`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col justify-between">
      <StorefrontHeader />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-8 space-y-8 sm:space-y-12 w-full">
        {/* 1. Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-500 overflow-x-auto pb-1">
          <Link href="/" className="hover:text-forest transition-colors">
            {locale === "bn" ? "হোম" : "Home"}
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-forest transition-colors">
            {locale === "bn" ? "দোকান" : "Shop"}
          </Link>
          {product.category && (
            <>
              <span>/</span>
              <Link
                href={`/products?category=${product.category.slug}`}
                className="hover:text-forest transition-colors font-medium text-stone-700"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-stone-900 font-semibold truncate max-w-[200px]">
            {product.name}
          </span>
        </nav>

        {/* 2. Main Product Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-start">
          {/* Left Gallery (5 cols) */}
          <div className="lg:col-span-6 space-y-3 sm:space-y-4">
            {/* Main Stage Image (Clean Edge-to-Edge Frame) */}
            <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-stone-100 border border-stone-200/80 shadow-card">
              <Image
                src={getSafeImageUrl(activeImage)}
                alt={product.name}
                fill
                priority
                unoptimized={true}
                className="object-cover object-center transition-all duration-300 hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.srcset = "";
                  target.src = "/placeholder.png";
                }}
              />

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                {product.organicCertified && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0F4A24]/90 backdrop-blur-md text-emerald-300 text-xs font-bold shadow-sm">
                    <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{locale === "bn" ? "১০০% খাঁটি" : "100% Organic"}</span>
                  </span>
                )}
                {hasDiscount && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-600 text-white text-xs font-extrabold shadow-sm">
                    {discountPercent}% {locale === "bn" ? "ছাড়" : "OFF"}
                  </span>
                )}
              </div>

              {/* Share Floating Button */}
              <button
                onClick={handleShare}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-white/95 hover:bg-white text-stone-700 shadow-md border border-stone-200/80 transition-all cursor-pointer active:scale-90 z-10"
                title={copied ? "Link Copied!" : "Share Product"}
                aria-label="Share product"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Thumbnail Carousel */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-none">
                {images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-stone-100 border-2 transition-all shrink-0 cursor-pointer ${
                      activeImageIndex === idx
                        ? "border-forest shadow-md scale-105 ring-2 ring-forest/20"
                        : "border-stone-200/80 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={getSafeImageUrl(img)}
                      alt={`${product.name} - thumbnail ${idx + 1}`}
                      fill
                      unoptimized={true}
                      className="object-cover"
                      sizes="80px"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.srcset = "";
                        target.src = "/placeholder.png";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Info Section (7 cols) */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-6">
            {/* Category & Badges */}
            <div className="space-y-1.5">
              {product.category && (
                <Link
                  href={`/products?category=${product.category.slug}`}
                  className="text-xs font-bold uppercase tracking-wider text-forest hover:underline"
                >
                  {product.category.name}
                </Link>
              )}
              <h1 className="text-xl sm:text-3xl font-bold font-display text-stone-900 leading-tight">
                {product.name}
              </h1>
              {formattedUnit && (
                <span className="inline-block text-xs font-semibold text-stone-500">
                  {locale === "bn" ? "প্যাক সাইজ:" : "Pack Size:"} {formattedUnit}
                </span>
              )}
            </div>

            {/* Price Box */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-stone-200/80 flex items-center justify-between shadow-2xs">
              <div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-forest">
                    {formatTaka(effectivePrice)}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm sm:text-base font-mono text-stone-400 line-through">
                      {formatTaka(Number(product.price))}
                    </span>
                  )}
                  {formattedUnit && (
                    <span className="text-xs font-medium text-stone-500">
                      / {formattedUnit}
                    </span>
                  )}
                </div>
              </div>

              {/* Stock Status Badge */}
              <div>
                {isOutOfStock ? (
                  <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200">
                    {locale === "bn" ? "স্টক আউট" : "Out of Stock"}
                  </span>
                ) : isLowStock ? (
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
                    {locale === "bn" ? `মাত্র ${formatBengaliNumber(product.stockQuantity)} টি বাকি!` : `Only ${product.stockQuantity} left!`}
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{locale === "bn" ? "স্টকে আছে" : "In Stock"}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Special Delivery Discount Offer Banner */}
            {(() => {
              let tiers: any[] = [];
              if (Array.isArray(product.deliveryDiscountTiers)) {
                tiers = product.deliveryDiscountTiers;
              } else if (typeof product.deliveryDiscountTiers === "string") {
                try {
                  tiers = JSON.parse(product.deliveryDiscountTiers);
                } catch (e) {}
              }
              if (tiers.length === 0 && Number(product.deliveryDiscountMinQty) > 0 && Number(product.deliveryDiscountAmount) > 0) {
                tiers.push({ minQty: product.deliveryDiscountMinQty, discountAmount: product.deliveryDiscountAmount });
              }

              if (tiers.length === 0) return null;

              return (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/80 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-950 font-bold text-xs sm:text-sm">
                    <div className="w-6 h-6 rounded-lg bg-amber-200/60 flex items-center justify-center shrink-0 text-amber-900">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <span>
                      {locale === "bn" ? "🎁 স্পেশাল ডেলিভারি ডিসকাউন্ট অফার" : "🎁 Special Delivery Discount Offers"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {tiers.map((t, idx) => {
                      const minQ = Number(t.minQty) || 1;
                      const discA = Number(t.discountAmount) || 0;
                      const isUnlocked = quantity >= minQ;
                      const needed = Math.max(0, minQ - quantity);
                      return (
                        <div
                          key={idx}
                          className={`p-2 rounded-xl border transition-all text-xs flex items-center justify-between ${
                            isUnlocked
                              ? "bg-amber-100/80 border-amber-400 font-bold text-amber-950 shadow-2xs"
                              : "bg-white/80 border-amber-200/60 text-stone-600"
                          }`}
                        >
                          <div>
                            <span className="block font-semibold">
                              {locale === "bn" ? `${formatBengaliNumber(minQ)}+ টি কিনলে` : `${minQ}+ Units`}
                            </span>
                            <span className="text-[10px] text-amber-800">
                              {isUnlocked
                                ? locale === "bn" ? "✓ অফার সক্রিয়!" : "✓ Offer Unlocked!"
                                : locale === "bn" ? `আর ${formatBengaliNumber(needed)} টি প্রয়োজন` : `${needed} more needed`}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-amber-900">
                            - {formatTaka(discA)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10.5px] text-amber-800 leading-tight">
                    {locale === "bn"
                      ? "কার্টে পরিমাণ বাড়ালে ডেলিভারি বিল থেকে স্বয়ংক্রিয়ভাবে সর্বোচ্চ ছাড় প্রযোজ্য হবে।"
                      : "Higher quantity orders automatically unlock larger delivery discounts."}
                  </p>
                </div>
              );
            })()}

            {/* Main Quantity Stepper & Action Buttons (Mobile + Desktop Visible) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1">
              <div className="flex items-center gap-2">
                {/* Stepper */}
                <div className="flex items-center border border-stone-200 rounded-xl bg-white p-1 shadow-2xs">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 flex items-center justify-center text-stone-700 hover:bg-stone-100 active:bg-stone-200 rounded-lg cursor-pointer transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-mono font-bold text-sm text-stone-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 flex items-center justify-center text-stone-700 hover:bg-stone-100 active:bg-stone-200 rounded-lg cursor-pointer transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile Buy Now Button (Inline for instant 1-tap checkout) */}
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="flex-1 sm:hidden py-3 px-4 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-4 h-4 text-stone-950 fill-stone-950" />
                  <span>{locale === "bn" ? "অর্ডার করুন" : "Buy Now"}</span>
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex-1 py-3 px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98 ${
                  added
                    ? "bg-emerald-600 text-white"
                    : "bg-forest hover:bg-forest-deep active:bg-forest-deep text-white"
                }`}
              >
                {added ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{locale === "bn" ? "কার্টে যোগ করা হয়েছে" : "Added to Cart"}</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                    <span>{locale === "bn" ? "কার্টে যোগ করুন" : "Add to Cart"}</span>
                  </>
                )}
              </button>

              {/* Desktop Buy Now */}
              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="hidden sm:flex py-3 px-6 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <Zap className="w-4 h-4 text-stone-950 fill-stone-950" />
                <span>{locale === "bn" ? "অর্ডার করুন" : "Buy Now"}</span>
              </button>
            </div>

            {/* Direct WhatsApp Order Button */}
            <button
              onClick={handleWhatsAppOrder}
              disabled={isOutOfStock}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1da850] text-stone-950 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-500/40"
            >
              <MessageCircle className="w-4 h-4 fill-stone-950 text-stone-950" />
              <span>{locale === "bn" ? "📲 হোয়াটসঅ্যাপে সরাসরি অর্ডার করুন" : "📲 Order Directly via WhatsApp"}</span>
            </button>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2">
              <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-stone-200 flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-forest shrink-0" />
                <div className="text-[11px] leading-tight">
                  <strong className="block text-stone-800">{locale === "bn" ? "দ্রুত ডেলিভারি" : "Fast Delivery"}</strong>
                  <span className="text-stone-500">{locale === "bn" ? "সারা বাংলাদেশে" : "Across Bangladesh"}</span>
                </div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-stone-200 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-[11px] leading-tight">
                  <strong className="block text-stone-800">{locale === "bn" ? "১০০% খাঁটি" : "100% Genuine"}</strong>
                  <span className="text-stone-500">{locale === "bn" ? "ল্যাব টেস্টেড" : "Quality Tested"}</span>
                </div>
              </div>
            </div>

            {/* Coins Earn Reward Callout */}
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">🪙</span>
                <div>
                  <strong className="text-amber-950 font-bold block">
                    {locale === "bn"
                      ? `অর্ডারে পাবেন ${formatBengaliNumber(Math.floor(effectivePrice / 10))} এনামার কয়েন!`
                      : `Earn ${Math.floor(effectivePrice / 10)} Enmar Coins on this order!`}
                  </strong>
                  <span className="text-[10.5px] text-amber-800">
                    {locale === "bn"
                      ? "পরবর্তী ক্রয়ে কয়েন ব্যবহার করে ইনস্ট্যান্ট ডিসকাউন্ট পাবেন।"
                      : "Redeemable for instant discounts on future purchases."}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-extrabold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full uppercase shrink-0">
                Reward
              </span>
            </div>

            {/* Farm-to-Source & Lab Purity Certificate Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  <h4 className="font-bold text-xs sm:text-sm text-emerald-950">
                    {locale === "bn" ? "উৎপাদন ক্ষেত্র ও বিশুদ্ধতার নিশ্চয়তা" : "Source Origin & Lab Purity"}
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                  100% Organic
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px] pt-1 border-t border-emerald-200/60">
                <div className="p-2 rounded-xl bg-white/90 border border-emerald-100 space-y-0.5">
                  <span className="text-[10px] text-stone-500 block">{locale === "bn" ? "উৎপাদন অঞ্চল" : "Origin District"}</span>
                  <strong className="text-stone-800 block truncate">{product.sourceOrigin || "সুন্দরবন / নাটোর"}</strong>
                </div>
                <div className="p-2 rounded-xl bg-white/90 border border-emerald-100 space-y-0.5">
                  <span className="text-[10px] text-stone-500 block">{locale === "bn" ? "সংগ্রহের মৌসুম" : "Harvest Period"}</span>
                  <strong className="text-stone-800 block truncate">{product.harvestDate || "চলতি মৌসুমের তাজা ফসল"}</strong>
                </div>
                <div className="p-2 rounded-xl bg-white/90 border border-emerald-100 space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-stone-500 block">{locale === "bn" ? "কোয়ালিটি ব্যাচ" : "Batch No."}</span>
                  <strong className="text-forest font-mono block truncate">{product.batchNumber || "ENM-QC-992"}</strong>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[10.5px] text-stone-600">
                  {product.labTestReportSummary || (locale === "bn" ? "বিএসটিআই মান ও মাইক্রোবায়োলজি বিশুদ্ধতা পরীক্ষিত।" : "BSTI standard & lab purity certified.")}
                </p>
                <button
                  onClick={() => setLabModalOpen(true)}
                  className="text-xs font-bold text-forest hover:text-forest-deep underline shrink-0 cursor-pointer"
                >
                  {locale === "bn" ? "ল্যাব সার্টিফিকেট দেখুন" : "View Lab Report"}
                </button>
              </div>
            </div>

            {/* Description & Full Details */}
            {product.description && (
              <div className="p-4 sm:p-6 rounded-2xl bg-white border border-stone-200/80 space-y-2.5">
                <h3 className="font-bold text-sm sm:text-base font-display text-stone-900 border-b border-stone-100 pb-2">
                  {locale === "bn" ? "পণ্যের বিবরণ ও বৈশিষ্ট্য" : "Product Details & Health Benefits"}
                </h3>
                <div className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                  {product.description}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer Photo Reviews Section */}
        <section className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-base sm:text-2xl font-bold font-display text-stone-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <span>{locale === "bn" ? "গ্রাহকদের ছবিসহ রিভিউ ও মতামত" : "Customer Photo Reviews & Feedback"}</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {locale === "bn"
                  ? "আমাদের পণ্য ব্যবহারকারী সম্মানিত গ্রাহকদের আনবক্সিং অভিজ্ঞতা ও ছবি।"
                  : "Authentic feedback & photos from verified customers who ordered this product."}
              </p>
            </div>

            <button
              onClick={() => setReviewModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-forest hover:bg-forest-deep text-white text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
            >
              {locale === "bn" ? "✍️ রিভিউ লিখুন ও ছবি দিন" : "✍️ Write a Review"}
            </button>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {reviewsList.length === 0 ? (
              <div className="p-8 text-center text-stone-400 bg-stone-50 rounded-2xl border border-stone-100">
                {locale === "bn"
                  ? "এই পণ্যে এখনও কোনো রিভিউ দেওয়া হয়নি। প্রথম রিভিউটি আপনিই দিন!"
                  : "No reviews yet. Be the first to share your experience with this organic product!"}
              </div>
            ) : (
              reviewsList.map((r: any) => {
                const photos = Array.isArray(r.photos) ? r.photos : [];
                return (
                  <div key={r.id} className="p-4 rounded-2xl bg-stone-50/70 border border-stone-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-forest text-white font-bold flex items-center justify-center text-xs uppercase">
                          {r.userName?.slice(0, 2) || "U"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-stone-900">{r.userName}</span>
                            {r.verifiedPurchase && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                Verified
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-stone-400">
                            {new Date(r.createdAt).toLocaleDateString("bn-BD")}
                          </span>
                        </div>
                      </div>

                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < r.rating ? "fill-amber-400 text-amber-400" : "text-stone-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed font-medium">
                      "{r.comment}"
                    </p>

                    {photos.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        {photos.map((img: string, idx: number) => (
                          <a
                            key={idx}
                            href={img}
                            target="_blank"
                            rel="noreferrer"
                            className="w-14 h-14 rounded-xl overflow-hidden border border-stone-200 hover:opacity-90 transition-opacity"
                          >
                            <img src={img} alt="Customer photo" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}

                    {r.adminReply && (
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-100 space-y-0.5">
                        <span className="text-[10px] font-bold text-forest">ENMAR Brand Response:</span>
                        <p className="text-[11px] text-stone-600">{r.adminReply}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* 3. Related Products Carousel/Grid */}
        {related.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-stone-200">
            <h2 className="text-base sm:text-2xl font-bold font-display text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-forest" />
              <span>{locale === "bn" ? "সম্পর্কিত অন্যান্য পণ্য" : "Related Organic Products"}</span>
            </h2>

            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-3.5">
              {related.map((item: any) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}

        {/* Lab Purity Certificate Modal */}
        {labModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-line shadow-2xl relative">
              <button
                onClick={() => setLabModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold font-display text-ink">
                  {locale === "bn" ? "খাঁটি অর্গানিক বিশুদ্ধতা ও ল্যাব সার্টিফিকেট" : "Official Purity & Quality Certificate"}
                </h3>
                <p className="text-xs text-stone-500">
                  {locale === "bn"
                    ? "এনামার ফুডস ১০০% প্রাকৃতিক ও রাসায়নিকমুক্ত খাদ্যের নিশ্চয়তা দেয়।"
                    : "Guaranteed 100% pure, natural, and free from harmful additives."}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3 text-xs">
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500">পণ্যের নাম:</span>
                  <span className="font-bold text-stone-900">{product.name}</span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500">উৎপাদন / সংগ্রহের অঞ্চল:</span>
                  <span className="font-bold text-stone-900">{product.sourceOrigin || "সুন্দরবন / নাটোর"}</span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500">কোয়ালিটি কন্ট্রোল ব্যাচ:</span>
                  <span className="font-bold font-mono text-forest">{product.batchNumber || "ENM-QC-992"}</span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500">এইচএমএফ ও আর্দ্রতা মান:</span>
                  <span className="font-bold text-emerald-700">আন্তর্জাতিক মানসম্পন্ন (পাস)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">পরীক্ষা সংস্থা:</span>
                  <span className="font-bold text-stone-900">আইসিডিডিআর,বি / বিএসটিআই মানদণ্ড</span>
                </div>
              </div>

              {product.purityCertificateUrl && (
                <div className="rounded-2xl overflow-hidden border border-stone-200">
                  <img src={product.purityCertificateUrl} alt="Certificate" className="w-full h-auto" />
                </div>
              )}

              <button
                onClick={() => setLabModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-forest hover:bg-forest-deep text-white text-xs font-bold"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        )}

        {/* Write Review Modal */}
        {reviewModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 border border-line shadow-2xl relative">
              <button
                onClick={() => setReviewModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-bold font-display text-ink flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <span>রিভিউ ও আনবক্সিং অভিজ্ঞতা লিখুন</span>
              </h3>

              <form onSubmit={handleSubmitReview} className="space-y-3.5">
                {/* Star rating selector */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    আপনার রেটিং নির্বাচন করুন:
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        className="p-1 cursor-pointer transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= reviewForm.rating
                              ? "text-amber-400 fill-amber-400"
                              : "text-stone-200"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    আপনার নাম *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. তানভীর হাসান"
                    value={reviewForm.userName}
                    onChange={(e) => setReviewForm({ ...reviewForm, userName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    পণ্য সম্পর্কে আপনার মন্তব্য *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="পণ্যটির স্বাদ, গন্ধ এবং প্যাকেজিং কেমন লেগেছে তা লিখুন..."
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    পণ্য / আনবক্সিং ছবি লিংক (ঐচ্ছিক)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://images... / photo url"
                      value={reviewForm.photoInput}
                      onChange={(e) => setReviewForm({ ...reviewForm, photoInput: e.target.value })}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (reviewForm.photoInput.trim()) {
                          setReviewForm({
                            ...reviewForm,
                            photos: [...reviewForm.photos, reviewForm.photoInput.trim()],
                            photoInput: "",
                          });
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold"
                    >
                      যুক্ত করুন
                    </button>
                  </div>
                  {reviewForm.photos.length > 0 && (
                    <div className="flex gap-2 pt-2">
                      {reviewForm.photos.map((p, i) => (
                        <div key={i} className="w-12 h-12 rounded-lg border overflow-hidden relative">
                          <img src={p} alt="upload" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="flex-1 py-2.5 rounded-xl bg-forest hover:bg-forest-deep text-white text-xs font-bold"
                  >
                    {submittingReview ? "জমা হচ্ছে..." : "রিভিউ জমা দিন"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* 1-Click Fast Checkout Modal */}
      <QuickOrderModal
        product={product}
        isOpen={isQuickOrderOpen}
        onClose={() => setIsQuickOrderOpen(false)}
      />

      <StorefrontFooter />
    </div>
  );
}
