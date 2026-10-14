"use client";
// app/account/orders/page.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Package,
  ExternalLink,
  Loader2,
  Calendar,
  Truck,
  RotateCcw,
} from "lucide-react";
import StorefrontHeader from "@/components/storefront/Header";
import StorefrontFooter from "@/components/storefront/Footer";
import AccountNav from "@/components/account/AccountNav";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { formatTaka } from "@/lib/utils";

export default function CustomerOrdersPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const { user, isAuthenticated, isLoaded } = useAuth();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isAuthenticated || !user) {
      router.push("/auth/login");
      return;
    }
    fetch(`/api/account/orders?email=${encodeURIComponent(user.email || "")}&phone=${encodeURIComponent(user.phone || "")}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOrders(data.orders || []);
        }
      })
      .finally(() => setLoading(false));
  }, [isLoaded, isAuthenticated]);

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col justify-between">
      <StorefrontHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-6">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <AccountNav />

          <div className="flex-1 w-full space-y-6">
            <div className="bg-paper p-6 sm:p-8 rounded-3xl border border-line shadow-card space-y-6">
              <div className="border-b border-line pb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold font-display text-ink">
                    {lang === "bn" ? "আমার অর্ডার হিস্ট্রি" : "Order History"}
                  </h1>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {lang === "bn"
                      ? "আপনার সমস্ত পূর্ববর্তী অর্ডারের লাইভ ট্র্যাকিং ও বিস্তারিত"
                      : "Live tracking & past invoice receipts"}
                  </p>
                </div>
                <span className="text-xs font-mono font-bold bg-bg px-3 py-1 rounded-full border border-line">
                  {orders.length} {lang === "bn" ? "অর্ডার" : "Orders"}
                </span>
              </div>

              {loading ? (
                <div className="p-12 text-center text-ink-soft">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-forest mb-2" />
                  <span>Loading orders...</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="p-12 text-center text-ink-soft space-y-3">
                  <Package className="w-10 h-10 mx-auto text-forest/40" />
                  <p className="text-sm font-semibold text-ink">
                    {lang === "bn" ? "কোন অর্ডার পাওয়া যায়নি" : "No orders found yet"}
                  </p>
                  <p className="text-xs max-w-sm mx-auto">
                    {lang === "bn"
                      ? "আমাদের ১০০% খাঁটি প্রাকৃতিক অর্গানিক পণ্যের কালেকশন ঘুরে দেখুন।"
                      : "Explore our farm-fresh Sundarban honey, bilona cow ghee, and cold-pressed oils."}
                  </p>
                  <Link
                    href="/products"
                    className="inline-flex px-5 py-2 rounded-full bg-forest text-white text-xs font-semibold"
                  >
                    {lang === "bn" ? "শপিং শুরু করুন" : "Start Shopping"}
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className="p-5 rounded-2xl bg-bg border border-line hover:border-forest/30 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line/60 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-ink">
                              #{o.orderNumber}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                o.orderStatus === "DELIVERED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : o.orderStatus === "PROCESSING"
                                  ? "bg-teal-100 text-teal-800"
                                  : o.orderStatus === "MAKING"
                                  ? "bg-orange-100 text-orange-800"
                                  : o.orderStatus === "SHIPPED" || o.orderStatus === "OUT_FOR_DELIVERY"
                                  ? "bg-blue-100 text-blue-800"
                                  : o.orderStatus === "CANCELLED"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {o.orderStatus}
                            </span>
                          </div>
                          <span className="text-[11px] text-ink-soft flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(o.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-xs text-ink-soft">{lang === "bn" ? "মোট মূল্য" : "Total Amount"}</span>
                          <div className="text-base font-bold font-mono text-forest">
                            {formatTaka(o.totalAmount)}
                          </div>
                        </div>
                      </div>

                      {/* Items list */}
                      <div className="space-y-1 text-xs">
                        {o.items?.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between text-ink-soft">
                            <span>
                              {item.quantity}x {item.productName} ({item.unit})
                            </span>
                            <span className="font-mono">{formatTaka(item.totalPrice)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Financial breakdown */}
                      <div className="pt-2 border-t border-line/40 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-ink-soft">
                          <span>{lang === "bn" ? "পণ্যের মোট মূল্য:" : "Products Subtotal:"}</span>
                          <span className="font-mono">{formatTaka(o.subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-ink-soft">
                          <span>{lang === "bn" ? "ডেলিভারি চার্জ:" : "Delivery Charge:"}</span>
                          <span className="font-mono">
                            {Number(o.shippingFee) === 0 ? (lang === "bn" ? "ফ্রি" : "FREE") : formatTaka(o.shippingFee)}
                          </span>
                        </div>
                        {Number(o.discountAmount) > 0 && (
                          <div className="flex items-center justify-between text-emerald-700 font-medium">
                            <span>{lang === "bn" ? "ছাড়:" : "Discount:"}</span>
                            <span className="font-mono">-{formatTaka(o.discountAmount)}</span>
                          </div>
                        )}
                        {Number(o.coinsDiscount) > 0 && (
                          <div className="flex items-center justify-between text-amber-700 font-medium">
                            <span>{lang === "bn" ? "কয়েন ছাড়:" : "Coins Discount:"}</span>
                            <span className="font-mono">-{formatTaka(o.coinsDiscount)}</span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-line/40">
                        <span className="text-[11px] font-mono text-ink-soft">
                          Tracking: {o.trackingId}
                        </span>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/returns/new`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-line bg-paper text-ink-soft text-xs font-semibold hover:text-ink"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{lang === "bn" ? "রিটার্ন" : "Return"}</span>
                          </Link>

                          <Link
                            href={`/track/${o.trackingId}`}
                            className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-forest hover:bg-forest-deep text-white text-xs font-bold shadow-xs"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>{lang === "bn" ? "লাইভ ট্র্যাক" : "Track Order"}</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <StorefrontFooter />
    </div>
  );
}
