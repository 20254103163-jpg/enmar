"use client";
import AlertModal from "@/components/ui/AlertModal";
// app/checkout/page.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  Truck,
  ShieldCheck,
  CreditCard,
  Phone,
  MapPin,
  TicketPercent,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Lock,
  ChevronRight,
  Home,
  Building,
  Coins,
  Clock,
  Calendar,
  Zap,
} from "lucide-react";
import StorefrontHeader from "@/components/storefront/Header";
import StorefrontFooter from "@/components/storefront/Footer";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { useFeatures } from "@/context/FeatureFlagContext";
import { useAuth } from "@/context/AuthContext";
import { formatTaka, getSafeImageUrl } from "@/lib/utils";

export default function CheckoutPage() {
  const router = useRouter();
  const {
    cart,
    cartSubtotal,
    clearCart,
    hasFreeShipping,
    totalCartWeightKg,
    deliveryFee: cartDeliveryFee,
    deliveryBreakdownText,
    deliveryResult,
  } = useCart();
  const { t, locale } = useLanguage();
  const { isFeatureEnabled } = useFeatures();
  const { user: authUser, isLoaded: authLoaded } = useAuth();

  const [customer, setCustomer] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    shippingAddress: "",
    deliveryZone: "Inside Dhaka",
    paymentMethod: "COD",
    customerNotes: "",
  });

  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | "custom">("custom");

  // Delivery Slots State
  const [deliverySlots, setDeliverySlots] = useState<any[]>([]);
  const [availableDates, setAvailableDates] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("morning");
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Loyalty Coins State
  const [loyaltyWallet, setLoyaltyWallet] = useState<any | null>(null);
  const [redeemCoinsChecked, setRedeemCoinsChecked] = useState(false);

  // Promo Code State
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any | null>(null);
  const [promoError, setPromoError] = useState("");
  const [validatingPromo, setValidatingPromo] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: "success" | "error" | "warning" | "info"; onConfirm?: () => void }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  useEffect(() => {
    // Fetch delivery slots & dates
    fetch("/api/storefront/delivery-slots")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.slots?.length > 0) setDeliverySlots(data.slots);
          if (data.availableDates?.length > 0) {
            setAvailableDates(data.availableDates);
            setSelectedDate(data.availableDates[0]?.isoDate || "");
          }
        }
      })
      .catch(() => {});

    // Fetch user loyalty wallet
    fetch("/api/loyalty/balance")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.wallet) {
          setLoyaltyWallet(data.wallet);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!authLoaded) return;
    if (authUser) {
      setCustomer(authUser);
      setFormData((prev) => ({
        ...prev,
        customerName: authUser.name || prev.customerName,
        customerPhone: authUser.phone || prev.customerPhone,
        customerEmail: authUser.email || prev.customerEmail,
        shippingAddress: authUser.address || prev.shippingAddress,
      }));

      if (authUser.id) {
        fetch(`/api/account/addresses?userId=${authUser.id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.addresses?.length > 0) {
              setSavedAddresses(data.addresses);
              const defaultAddr =
                data.addresses.find((a: any) => a.isDefault) || data.addresses[0];
              if (defaultAddr) {
                setSelectedAddressId(defaultAddr.id);
                setFormData((prev) => ({
                  ...prev,
                  customerName: defaultAddr.recipientName,
                  customerPhone: defaultAddr.phone,
                  shippingAddress: `${defaultAddr.streetAddress}, ${
                    defaultAddr.area ? defaultAddr.area + ", " : ""
                  }${defaultAddr.city}`,
                  deliveryZone: "Inside Dhaka",
                }));
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [authLoaded, authUser]);

  const handleSelectAddress = (addr: any) => {
    setSelectedAddressId(addr.id);
    setFormData((prev) => ({
      ...prev,
      customerName: addr.recipientName,
      customerPhone: addr.phone,
      shippingAddress: `${addr.streetAddress}, ${
        addr.area ? addr.area + ", " : ""
      }${addr.city}`,
      deliveryZone: "Inside Dhaka",
    }));
  };

  const isPromoFreeShipping =
    appliedPromo &&
    (appliedPromo.discountType === "FREE_SHIPPING" || appliedPromo.discountType === "free_shipping");
  const deliveryFee = isPromoFreeShipping ? 0 : cartDeliveryFee;
  const discountAmount =
    appliedPromo && !isPromoFreeShipping ? Number(appliedPromo.discountAmount || 0) : 0;

  // Delivery Zone: Currently service is strictly limited to Inside Dhaka
  const isOutsideDhaka = false;
  const zoneAdjustment = 0;

  // Selected Delivery Slot
  const selectedSlot = deliverySlots.find((s) => s.id === selectedSlotId) || deliverySlots[0];
  const slotExtraFee = selectedSlot?.extraFee ? Number(selectedSlot.extraFee) : 0;
  const effectiveDeliveryFee = deliveryFee + slotExtraFee + zoneAdjustment;

  // Enmar Coins calculation
  const availableCoins = loyaltyWallet?.coinsBalance || 0;
  const maxAllowedCoinsDiscount = Math.floor(cartSubtotal * 0.5); // Max 50% paid with coins
  const coinsDiscount = redeemCoinsChecked
    ? Math.min(availableCoins, maxAllowedCoinsDiscount, cartSubtotal)
    : 0;
  const coinsToRedeem = coinsDiscount;

  const grandTotal = Math.max(
    0,
    cartSubtotal - discountAmount - coinsDiscount + effectiveDeliveryFee
  );

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;

    setValidatingPromo(true);
    setPromoError("");
    try {
      const res = await fetch("/api/storefront/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoInput.trim(),
          subtotal: cartSubtotal,
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedPromo(data);
      } else {
        setPromoError(data.error || "Invalid promo code.");
      }
    } catch (err: any) {
      setPromoError("Failed to validate promo code.");
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // Enforcement: If require_login_checkout is enabled and customer is not logged in
    if (isFeatureEnabled("require_login_checkout") && (!authUser || !authUser.id)) {
      setAlertState({
        isOpen: true,
        title: locale === "bn" ? "লগইন আবশ্যক" : "Login Required",
        message:
          locale === "bn"
            ? "অর্ডার সম্পন্ন করতে অনুগ্রহ করে আপনার অ্যাকাউন্টে সাইন ইন বা রেজিস্টার করুন।"
            : "Please sign in or register to place your order.",
        type: "warning",
        onConfirm: () => router.push("/auth/login?callbackUrl=/checkout"),
      });
      return;
    }

    // Enforcement: Delivery is strictly inside Dhaka
    if (formData.deliveryZone === "Outside Dhaka") {
      setAlertState({
        isOpen: true,
        title: locale === "bn" ? "ডেলিভারি এলাকা সংক্রান্ত" : "Delivery Service Area",
        message:
          locale === "bn"
            ? "খাবারের বিশুদ্ধ মান ও সর্বোচ্চ সতেজতা বজায় রাখতে আপাতত আমাদের হোম ডেলিভারি সেবা শুধুমাত্র ঢাকা সিটির ভেতরে চালু রয়েছে।"
            : "Currently, our delivery service is strictly available inside Dhaka City only.",
        type: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const orderPayload = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        userId: authUser ? authUser.id : (customer ? customer.id : null),
        customerEmail: formData.customerEmail || (authUser ? authUser.email : (customer ? customer.email : "customer@enmar.bd")),
        shippingAddress: formData.shippingAddress,
        deliveryZone: formData.deliveryZone,
        paymentMethod: formData.paymentMethod,
        customerNotes: formData.customerNotes,
        subtotal: cartSubtotal,
        discountAmount,
        promoCodeId: appliedPromo?.promoId || null,
        promoCodeText: appliedPromo?.code || null,
        shippingFee: effectiveDeliveryFee,
        totalAmount: grandTotal,
        deliverySlot: selectedSlot ? `${selectedSlot.label} (${selectedSlot.timeRange})` : null,
        preferredDeliveryDate: selectedDate || null,
        coinsRedeemed: coinsToRedeem,
        coinsDiscount: coinsDiscount,
        items: cart.map((item) => ({
          productId: item.id,
          productName: item.name,
          unitPrice: item.discountPrice || item.price,
          quantity: item.quantity,
          unit: item.unit,
          itemImage: item.image,
          totalPrice: (item.discountPrice || item.price) * item.quantity,
        })),
      };

      const res = await fetch("/api/storefront/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const json = await res.json();

      if (json.success && json.order) {
        clearCart();

        if (formData.paymentMethod !== "COD") {
          const sslRes = await fetch("/api/payments/sslcommerz/init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: json.order.id }),
          });
          const sslJson = await sslRes.json();
          if (sslJson.gatewayUrl) {
            window.location.href = sslJson.gatewayUrl;
            return;
          }
        }

        router.push(`/track/${json.order.trackingId}`);
      } else {
        setAlertState({
          isOpen: true,
          title: "Order Placement Error",
          message: json.error || "Failed to place order. Please try again.",
          type: "error",
        });
      }
    } catch (error: any) {
      setAlertState({
        isOpen: true,
        title: "Order Placement Error",
        message: error.message || "An unexpected error occurred.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col justify-between">
        <StorefrontHeader />
        <main className="max-w-4xl mx-auto px-4 py-24 text-center space-y-4">
          <ShoppingBag className="w-16 h-16 text-stone-300 mx-auto" />
          <h1 className="text-2xl font-bold font-display">{t("cart.emptyTitle")}</h1>
          <p className="text-xs text-stone-600">
            {locale === "bn"
              ? "আপনার কার্টে কোনো পণ্য নেই। আমাদের খাঁটি অর্গানিক খাদ্যের সমাহার দেখুন।"
              : "Your cart is currently empty. Explore our organic catalog."}
          </p>
          <Link
            href="/products"
            className="inline-flex px-6 py-2.5 rounded-xl bg-forest text-white text-xs font-semibold"
          >
            {t("cart.startShopping")}
          </Link>
        </main>
        <StorefrontFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col justify-between">
      <StorefrontHeader />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 flex-1 w-full space-y-6 pb-28 md:pb-16">
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Link href="/products" className="hover:text-forest">
            {t("checkout.title")}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-stone-900 font-semibold">{t("checkout.title")}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form */}
          <div className="lg:col-span-7 space-y-6">
            {/* Login Prompt Banner */}
            {!authUser && (
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isFeatureEnabled("require_login_checkout")
                    ? "bg-amber-50/90 border-amber-300 text-amber-950"
                    : "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isFeatureEnabled("require_login_checkout")
                        ? "bg-amber-200 text-amber-900"
                        : "bg-emerald-200 text-emerald-900"
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-display">
                      {isFeatureEnabled("require_login_checkout")
                        ? (locale === "bn" ? "অর্ডার করার জন্য লগইন প্রয়োজন" : "Login Required to Order")
                        : (locale === "bn" ? "পূর্বে অ্যাকাউন্ট আছে?" : "Already have an account?")}
                    </h4>
                    <p className="text-[11px] opacity-80">
                      {isFeatureEnabled("require_login_checkout")
                        ? (locale === "bn"
                            ? "অর্ডার কনফার্ম করতে অনুগ্রহ করে সাইন ইন বা রেজিস্টার করুন।"
                            : "Please sign in or register to complete your order.")
                        : (locale === "bn"
                            ? "দ্রুত চেকআউট ও পয়েন্ট পেতে সাইন ইন করুন।"
                            : "Sign in for faster checkout and order tracking.")}
                    </p>
                  </div>
                </div>

                <Link
                  href="/auth/login?callbackUrl=/checkout"
                  className="shrink-0 px-4 py-2 rounded-xl bg-forest hover:bg-forest-deep text-white text-xs font-bold transition-all shadow-xs"
                >
                  {locale === "bn" ? "লগইন / সাইন আপ" : "Sign In / Register"}
                </Link>
              </div>
            )}

            {savedAddresses.length > 0 && (
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-forest" />
                    <span>{locale === "bn" ? "সংরক্ষিত ঠিকানা" : "Saved Addresses"}</span>
                  </span>
                  <Link href="/account/addresses" className="text-[11px] font-semibold text-forest underline">
                    {locale === "bn" ? "ঠিকানা পরিচালনা" : "Manage"}
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => handleSelectAddress(addr)}
                      className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        selectedAddressId === addr.id
                          ? "border-forest bg-emerald-50/50 ring-1 ring-forest"
                          : "border-stone-200 hover:border-stone-400 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-stone-900">
                        <span>{addr.recipientName}</span>
                        {addr.isDefault && (
                          <span className="text-[10px] bg-forest text-white px-1.5 py-0.5 rounded">Default</span>
                        )}
                      </div>
                      <div className="text-stone-600 mt-1 line-clamp-1">{addr.streetAddress}</div>
                      <div className="text-stone-400 text-[10px] mt-0.5">{addr.phone}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Destination & Contact */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold font-display text-stone-900 border-b border-stone-200 pb-3">
                {t("checkout.destination")}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    {t("checkout.name")} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tanvir Ahmed"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:border-forest"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    {t("checkout.phone")} *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 017XXXXXXXX"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono focus:outline-none focus:border-forest"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-700">
                  {t("checkout.email")} ({t("checkout.title")})
                </label>
                <input
                  type="email"
                  placeholder="e.g. name@domain.com"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:border-forest"
                />
              </div>

              {/* Delivery Zone Radio Cards */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-semibold text-stone-700">
                  {t("checkout.zone")} *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all border-forest bg-emerald-50/60 ring-1 ring-forest`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="deliveryZone"
                        checked={true}
                        readOnly
                        className="w-4 h-4 text-forest"
                      />
                      <div>
                        <span className="text-xs font-bold text-stone-900 block">
                          {locale === "bn" ? "ঢাকা সিটির ভেতরে (Inside Dhaka)" : "Inside Dhaka City"}
                        </span>
                        <span className="text-[11px] text-stone-500 font-mono block mt-0.5">
                          {deliveryFee === 0 ? "ফ্রি ডেলিভারি" : `চার্জ: ${formatTaka(deliveryFee)}`}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-forest">
                        {deliveryFee === 0 ? "ফ্রি" : formatTaka(deliveryFee)}
                      </span>
                      <Truck className="w-4 h-4 text-forest" />
                    </div>
                  </label>

                  {/* Outside Dhaka - Disabled with informative notice */}
                  <div
                    className="p-3.5 rounded-xl border border-dashed border-stone-300 bg-stone-100/70 flex items-center justify-between cursor-not-allowed opacity-75"
                    title="আপাতত ঢাকার বাইরে ডেলিভারি সেবা বন্ধ রয়েছে"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="deliveryZone"
                        disabled
                        checked={false}
                        className="w-4 h-4 text-stone-400 cursor-not-allowed"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-stone-600">
                            {locale === "bn" ? "ঢাকার বাইরে" : "Outside Dhaka"}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            আপাতত বন্ধ
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-500 block mt-0.5">
                          {locale === "bn"
                            ? "শুধুমাত্র ঢাকা সিটির ভেতরে চালু রয়েছে"
                            : "Service limited to Dhaka City only"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-medium text-stone-400">
                        {locale === "bn" ? "উপলব্ধ নয়" : "Unavailable"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Important notice alert */}
                <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-start gap-2 text-[11px] text-amber-900">
                  <span className="text-sm leading-none mt-0.5">🚚</span>
                  <div>
                    <span className="font-bold">ডেলিভারি এলাকা সংক্রান্ত নোটিশ: </span>
                    <span>আমাদের খাবারের বিশুদ্ধ মান ও সর্বোচ্চ সতেজতা নিশ্চিত করতে আপাতত হোম ডেলিভারি সেবা শুধুমাত্র ঢাকা সিটির ভেতরে চালু রয়েছে। ঢাকার বাইরে কোনো ডেলিভারি সেবা নেই।</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-700">
                  {t("checkout.address")} *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="House 12, Road 4, Sector 3, Uttara, Dhaka"
                  value={formData.shippingAddress}
                  onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:border-forest"
                />
              </div>
            </div>

            {/* Scheduled Delivery Date & Time Slot Selector */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h3 className="text-base font-bold font-display text-stone-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-forest" />
                  <span>{locale === "bn" ? "ডেলিভারি তারিখ ও সময় নির্বাচন" : "Select Delivery Date & Time Slot"}</span>
                </h3>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase">
                  হোম ডেলিভারি
                </span>
              </div>

              {/* Delivery Date Pills */}
              {availableDates.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-stone-700">
                    {locale === "bn" ? "পছন্দের ডেলিভারি তারিখ" : "Preferred Date"}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {availableDates.map((d) => (
                      <button
                        key={d.isoDate}
                        type="button"
                        onClick={() => setSelectedDate(d.isoDate)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          selectedDate === d.isoDate
                            ? "border-forest bg-forest text-white shadow-xs"
                            : "border-stone-200 hover:border-stone-300 bg-stone-50 text-stone-800"
                        }`}
                      >
                        <span className="block text-[11px] font-bold">{d.dayName}</span>
                        <span className="block text-[10px] opacity-80">{d.formattedDate}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Slots */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-semibold text-stone-700">
                  {locale === "bn" ? "ডেলিভারি টাইম স্লট" : "Preferred Delivery Slot"}
                </label>
                <div className="space-y-2">
                  {deliverySlots.map((slot) => {
                    const isSelected = selectedSlotId === slot.id;
                    return (
                      <div
                        key={slot.id}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? "border-forest bg-emerald-50/60 ring-1 ring-forest"
                            : "border-stone-200 hover:border-stone-300 bg-stone-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="deliverySlot"
                            checked={isSelected}
                            onChange={() => setSelectedSlotId(slot.id)}
                            className="w-4 h-4 text-forest"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-stone-900">{slot.label}</span>
                              {slot.badge && (
                                <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                                  {slot.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-stone-500 block mt-0.5">
                              {slot.timeRange}
                            </span>
                          </div>
                        </div>

                        {slot.extraFee > 0 ? (
                          <span className="text-xs font-bold text-amber-700 font-mono">
                            +৳{slot.extraFee}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-700">
                            নরমাল
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold font-display text-stone-900 border-b border-stone-200 pb-3">
                {t("checkout.paymentMethod")}
              </h3>

              <div className="space-y-3">
                <label
                  className={`p-4 rounded-xl border flex items-start justify-between cursor-pointer transition-all ${
                    formData.paymentMethod === "COD"
                      ? "border-forest bg-emerald-50/60 ring-1 ring-forest"
                      : "border-stone-200 hover:border-stone-300 bg-stone-50/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={formData.paymentMethod === "COD"}
                      onChange={() => setFormData({ ...formData, paymentMethod: "COD" })}
                      className="w-4 h-4 text-forest mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">{t("checkout.cod")}</span>
                      <span className="text-[11px] text-stone-500 mt-0.5 block">{t("checkout.codDesc")}</span>
                    </div>
                  </div>
                </label>

                <label
                  className={`p-4 rounded-xl border flex items-start justify-between cursor-pointer transition-all ${
                    formData.paymentMethod === "BKASH"
                      ? "border-forest bg-emerald-50/60 ring-1 ring-forest"
                      : "border-stone-200 hover:border-stone-300 bg-stone-50/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={formData.paymentMethod === "BKASH"}
                      onChange={() => setFormData({ ...formData, paymentMethod: "BKASH" })}
                      className="w-4 h-4 text-forest mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">{t("checkout.bkash")}</span>
                      <span className="text-[11px] text-stone-500 mt-0.5 block">{t("checkout.bkashDesc")}</span>
                    </div>
                  </div>
                  <CreditCard className="w-5 h-5 text-forest shrink-0" />
                </label>
              </div>
            </div>
          </div>

          {/* Right Summary (5 Cols) */}
          <div className="lg:col-span-5 space-y-6 sticky top-24">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6">
              <h3 className="text-base font-bold font-display text-stone-900 border-b border-stone-200 pb-3">
                {t("checkout.orderSummary")} ({cart.length})
              </h3>

              {/* Items List */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-b from-[#FAF8F5] to-[#F4EFEB] border border-stone-200/80 shrink-0 flex items-center justify-center p-0.5 shadow-xs">
                        <Image
                          src={getSafeImageUrl(item.image)}
                          alt={item.name}
                          fill
                          className="object-contain p-0.5 drop-shadow-xs"
                          sizes="40px"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.srcset = "";
                            target.src = "/placeholder.png";
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-stone-900 truncate">{item.name}</h4>
                        <span className="text-stone-500 font-mono text-[11px]">
                          {formatTaka(item.price)} × {item.quantity}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-stone-900">
                      {formatTaka(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Promo Input */}
              <form onSubmit={handleApplyPromo} className="pt-4 border-t border-stone-200">
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  {t("checkout.havePromo")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. ENMAR10"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono uppercase focus:outline-none focus:border-forest"
                  />
                  <button
                    type="submit"
                    disabled={validatingPromo || !promoInput.trim()}
                    className="px-4 py-2 rounded-xl bg-forest text-white text-xs font-bold shadow-xs hover:bg-forest-deep disabled:opacity-50 cursor-pointer"
                  >
                    {validatingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("checkout.apply")}
                  </button>
                </div>
                {appliedPromo && (
                  <div className="text-[11px] text-emerald-700 font-semibold mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>কুপন কোড '{appliedPromo.code}' সফলভাবে প্রয়োগ হয়েছে!</span>
                  </div>
                )}
                {promoError && (
                  <div className="text-[11px] text-rose-600 font-semibold mt-1.5">
                    {promoError}
                  </div>
                )}
              </form>

              {/* Enmar Coins Redemption Box */}
              {availableCoins > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/80 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-amber-950 block">
                          এনামার কয়েন ওয়ালেট (Enmar Coins)
                        </span>
                        <span className="text-[10px] text-amber-800">
                          আপনার ওয়ালেটে {availableCoins}টি কয়েন আছে (মূল্য: ৳{availableCoins})
                        </span>
                      </div>
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-50/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={redeemCoinsChecked}
                      onChange={(e) => setRedeemCoinsChecked(e.target.checked)}
                      className="w-4 h-4 rounded text-forest focus:ring-forest accent-forest"
                    />
                    <div className="flex-1 flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-800">
                        {redeemCoinsChecked ? "কয়েন ছাড় প্রয়োগ করা হয়েছে" : "কয়েন ব্যবহার করে ছাড় নিন"}
                      </span>
                      {redeemCoinsChecked && (
                        <span className="font-mono font-bold text-emerald-700">
                          -৳{coinsDiscount}
                        </span>
                      )}
                    </div>
                  </label>
                </div>
              )}

              {/* Calculations */}
              <div className="space-y-2.5 text-xs pt-4 border-t border-stone-200">
                <div className="flex items-center justify-between text-stone-600">
                  <span>{t("cart.subtotal")}</span>
                  <span className="font-mono font-semibold text-stone-900">{formatTaka(cartSubtotal)}</span>
                </div>

                {/* Parcel Total Weight */}
                <div className="flex items-center justify-between text-stone-600 bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-200/80">
                  <span className="flex items-center gap-1.5 font-medium text-stone-700">
                    📦 মোট পার্সেল ওজন
                  </span>
                  <span className="font-mono font-bold text-stone-900">
                    {totalCartWeightKg} কেজি {totalCartWeightKg < 1 ? `(${Math.round(totalCartWeightKg * 1000)} গ্রাম)` : ""}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-700 font-semibold">
                    <span>কুপন ছাড় (Promo Discount)</span>
                    <span className="font-mono">- {formatTaka(discountAmount)}</span>
                  </div>
                )}

                {coinsDiscount > 0 && (
                  <div className="flex items-center justify-between text-amber-700 font-semibold">
                    <span>🪙 এনামার কয়েন ছাড় ({coinsToRedeem} Coins)</span>
                    <span className="font-mono">- {formatTaka(coinsDiscount)}</span>
                  </div>
                )}

                <div className="pt-1">
                  <div className="flex items-center justify-between text-stone-700 font-medium">
                    <span>ডেলিভারি চার্জ</span>
                    <span className="font-mono font-bold text-stone-900">
                      {effectiveDeliveryFee === 0 ? (
                        <span className="text-emerald-700 font-bold">ফ্রি</span>
                      ) : (
                        formatTaka(effectiveDeliveryFee)
                      )}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    {deliveryBreakdownText}
                  </div>
                </div>

                <div className="flex items-center justify-between text-base font-bold text-stone-900 pt-3 border-t border-stone-200">
                  <span>{t("cart.total")}</span>
                  <span className="font-mono text-forest text-xl">{formatTaka(grandTotal)}</span>
                </div>
              </div>

              {/* Confirm Order Button */}
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitOrder}
                className="w-full py-4 rounded-xl bg-forest hover:bg-forest-deep text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t("checkout.placingOrder")}</span>
                  </>
                ) : isFeatureEnabled("require_login_checkout") && !authUser ? (
                  <>
                    <Lock className="w-4 h-4 text-amber-300" />
                    <span>{locale === "bn" ? "লগইন করে অর্ডার সম্পন্ন করুন" : "Sign In & Complete Order"}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-amber-300" />
                    <span>{t("checkout.confirm")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      <StorefrontFooter />
    
      <AlertModal
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={() => {
          setAlertState((prev) => ({ ...prev, isOpen: false }));
          if (alertState.onConfirm) alertState.onConfirm();
        }}
      />
    </div>
  );
}
