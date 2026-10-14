"use client";
// app/track/[trackingId]/page.tsx

import { useEffect, useState, use, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Truck,
  Printer,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  AlertCircle,
  RotateCcw,
  Loader2,
  User,
  Phone,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import StorefrontHeader from "@/components/storefront/Header";
import StorefrontFooter from "@/components/storefront/Footer";
import { formatTaka } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { useLiveSync } from "@/lib/useLiveSync";
import ConfirmModal from "@/components/ui/ConfirmModal";
import AlertModal from "@/components/ui/AlertModal";

const LiveDeliveryMap = dynamic(() => import("@/components/storefront/LiveDeliveryMap"), {
  ssr: false,
  loading: () => (
    <div className="bg-paper p-8 rounded-3xl border border-emerald-300 shadow-card text-center text-xs text-ink-soft animate-pulse">
      Connecting to delivery rider live GPS feed...
    </div>
  ),
});

function OrderTrackingDetailContent({
  params,
}: {
  params: Promise<{ trackingId: string }>;
}) {
  const { trackingId } = use(params);
  const searchParams = useSearchParams();
  const paymentQuery = searchParams?.get("payment");
  const { t, locale } = useLanguage();

  const STAGES = [
    { key: "PENDING", label: locale === "bn" ? "অপেক্ষমান" : "Pending", desc: "Awaiting confirmation" },
    { key: "CONFIRMED", label: locale === "bn" ? "নিশ্চিত" : "Confirmed", desc: "Verified with customer" },
    { key: "PROCESSING", label: locale === "bn" ? "প্রক্রিয়াধীন" : "Processing", desc: "Order queued & in processing" },
    { key: "MAKING", label: locale === "bn" ? "তৈরি হচ্ছে" : "Making", desc: "Freshly preparing & crafting" },
    { key: "PACKED", label: locale === "bn" ? "প্যাকিং সম্পন্ন" : "Packed", desc: "Fresh organic items sealed" },
    { key: "SHIPPED", label: locale === "bn" ? "শিপিং সম্পন্ন" : "Shipped", desc: "Handed over to courier" },
    { key: "OUT_FOR_DELIVERY", label: locale === "bn" ? "ডেলিভারির পথে" : "Out for Delivery", desc: "Rider on the way" },
    { key: "DELIVERED", label: locale === "bn" ? "ডেলিভারি সম্পন্ন" : "Delivered", desc: "Delivered successfully" },
  ];

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Self-Service Cancellation State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const fetchTracking = async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      const res = await fetch(`/api/storefront/track/${trackingId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Order not found");
      }
      setOrder(json.order);
      setError("");
    } catch (err: any) {
      if (!isBackground) {
        setError(err.message);
        setOrder(null);
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchTracking(false);
  }, [trackingId]);

  // Bidirectional real-time sync (polls every 4s to reflect admin status updates live)
  useLiveSync(() => fetchTracking(true), { interval: 4000 });

  const handleRefresh = () => {
    fetchTracking(false);
  };

  const handleSelfServiceCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/storefront/orders/${trackingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Cancelled by customer (Self-service)",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to cancel order.");
      }

      setShowCancelModal(false);
      await fetchTracking(false);
      setAlertState({
        isOpen: true,
        title: "Order Cancelled Successfully",
        message: "Your order has been cancelled and the items have been returned to store inventory. A cancellation confirmation has been sent to your phone/email.",
        type: "success",
      });
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        title: "Cancellation Failed",
        message: err.message || "Failed to cancel order.",
        type: "error",
      });
    } finally {
      setCancelling(false);
    }
  };

  const getStageIndex = (status: string) => {
    return STAGES.findIndex((s) => s.key === status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-ink flex flex-col justify-between">
        <StorefrontHeader />
        <div className="flex-1 flex items-center justify-center py-24 text-forest font-medium">
          <Loader2 className="w-8 h-8 animate-spin mr-3" />
          <span>Fetching live tracking status...</span>
        </div>
        <StorefrontFooter />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-bg text-ink flex flex-col justify-between">
        <StorefrontHeader />
        <main className="max-w-2xl mx-auto px-4 py-24 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-display text-ink">Tracking ID Not Found</h2>
            <p className="text-xs text-ink-soft mt-1 max-w-sm mx-auto">
              We could not find any order with tracking ID <strong>{trackingId}</strong>. Please check your spelling or contact support.
            </p>
          </div>
          <Link
            href="/track"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-forest text-white text-xs font-semibold"
          >
            <span>Try Another ID</span>
          </Link>
        </main>
        <StorefrontFooter />
      </div>
    );
  }

  const currentStageIndex = getStageIndex(order.orderStatus);
  const isCancelled = order.orderStatus === "CANCELLED";
  const isReturned = order.orderStatus === "RETURNED";
  const isPending = order.orderStatus === "PENDING";

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col justify-between">
      <StorefrontHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Payment Callback Alert Notification */}
        {paymentQuery === "success" && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <strong>Payment Received:</strong> Your SSLCommerz online payment has been confirmed! Your order is now verified and moving to the farm packing station.
            </div>
          </div>
        )}

        {paymentQuery === "failed" && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <strong>Payment Failed / Incomplete:</strong> Your online transaction could not be completed. Your order is registered under Cash on Delivery (COD) or pending retry.
            </div>
          </div>
        )}

        {/* Top Tracking Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-paper p-6 rounded-3xl border border-line shadow-card">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-forest">
                Tracking Token
              </span>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-1 text-[11px] text-forest hover:underline cursor-pointer"
                title="Refresh tracking status"
              >
                <RotateCcw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
                <span>{refreshing ? "Updating..." : t("track.liveSync")}</span>
              </button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-mono text-ink tracking-wide">
              {order.trackingId}
            </h1>
            <p className="text-xs text-ink-soft">
              Order No: <strong className="font-mono text-ink">{order.orderNumber}</strong> � Placed on {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          <div className="flex flex-col sm:items-end justify-between gap-2">
            <div className="flex items-center gap-2 mt-1 print:hidden">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg border border-line hover:border-forest text-xs font-semibold text-ink transition-colors cursor-pointer shadow-xs"
                title="Print Customer Receipt"
              >
                <Printer className="w-3.5 h-3.5 text-forest" />
                <span>{locale === "bn" ? "রিসিট প্রিন্ট করুন" : "Print Receipt"}</span>
              </button>
            </div>
            <div className="sm:text-right">
              <span className="text-xs text-ink-soft block">Payable Amount</span>
              <span className="text-2xl font-bold font-display font-mono text-forest">
                {formatTaka(order.totalAmount)}
              </span>
              <span className="text-[11px] text-ink-soft block mt-0.5">
                Method: <strong>{order.paymentMethod}</strong> ({order.paymentStatus})
              </span>
            </div>

            {/* Customer Self-Service Cancellation (Visible ONLY when PENDING) */}
            {isPending && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Cancel Order</span>
              </button>
            )}
          </div>
        </div>

        {/* Cancelled Alert Banner with Detailed Reason & Refund Status */}
        {isCancelled && (
          <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-900 space-y-3 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-300">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-rose-800">
                  Order Cancelled
                </h3>
                <p className="text-xs text-rose-700">
                  This order is cancelled and will not be dispatched. Product inventory has been restored.
                </p>
              </div>
            </div>

            {/* Cancellation Reason Display */}
            {order.cancellationReason && (
              <div className="p-3.5 rounded-2xl bg-white/80 border border-rose-200 text-xs text-ink space-y-1">
                <span className="font-semibold text-rose-800 uppercase tracking-wider text-[10px]">
                  Reason for Cancellation:
                </span>
                <p className="font-medium text-ink/90">{order.cancellationReason}</p>
              </div>
            )}

            {/* Refund Status Display */}
            {(order.refundNeeded || order.refundStatus === "REFUND_NEEDED" || order.paymentStatus === "REFUNDED") && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-amber-950">
                    {order.paymentStatus === "REFUNDED" || order.refundStatus === "REFUNDED"
                      ? "Online Payment Refunded"
                      : "Refund Processing"}
                  </strong>
                  <span className="text-[11px] text-amber-800">
                    {order.paymentStatus === "REFUNDED" || order.refundStatus === "REFUNDED"
                      ? "Your refund has been disbursed back to your original payment channel."
                      : "Our billing team has flagged this order and is processing your refund back to your bKash/Nagad/Card."}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {isReturned && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
            <div>
              <strong>Order Returned:</strong> This order was returned to our fulfillment warehouse.
            </div>
          </div>
        )}

        {/* Live GPS Map (Visible when order is OUT_FOR_DELIVERY and rider has active GPS sharing) */}
        {!isCancelled &&
          !isReturned &&
          order.orderStatus === "OUT_FOR_DELIVERY" &&
          order.deliveryPersonnel &&
          order.deliveryPersonnel.isSharingLocation &&
          order.deliveryPersonnel.currentLat !== null && (
            <div className="animate-in fade-in duration-300">
              <LiveDeliveryMap
                riderName={order.deliveryPersonnel.name}
                riderPhone={order.deliveryPersonnel.phone}
                vehicleType={order.deliveryPersonnel.vehicleType || "Motorbike"}
                currentLat={order.deliveryPersonnel.currentLat}
                currentLng={order.deliveryPersonnel.currentLng}
                lastUpdated={order.deliveryPersonnel.lastLocationUpdate}
                destinationAddress={order.shippingAddress}
              />
            </div>
          )}

        {/* Visual 6-Stage Horizontal Stepper */}
        {!isCancelled && !isReturned && (
          <div className="bg-paper p-6 sm:p-8 rounded-3xl border border-line shadow-card space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-display text-ink uppercase tracking-wider">
                Delivery Progress
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-forest-soft text-forest border border-forest/20">
                {STAGES[currentStageIndex]?.label || order.orderStatus}
              </span>
            </div>

            <div className="relative">
              {/* Desktop Stepper */}
              <div className="hidden sm:grid grid-cols-4 md:grid-cols-8 gap-2 relative">
                {/* Connecting Line */}
                <div className="absolute top-4 left-6 right-6 h-0.5 bg-line -z-0" />
                <div
                  className="absolute top-4 left-6 h-0.5 bg-forest transition-all duration-500 -z-0"
                  style={{
                    width: `${Math.max(0, (currentStageIndex / (STAGES.length - 1)) * 100)}%`,
                  }}
                />

                {STAGES.map((stg, idx) => {
                  const isCompleted = idx <= currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  return (
                    <div key={stg.key} className="flex flex-col items-center text-center relative z-10 space-y-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all duration-300 ${
                          isCompleted
                            ? "bg-forest text-white shadow-premium ring-4 ring-forest-soft"
                            : "bg-paper border-2 border-line text-ink-soft"
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>

                      <div>
                        <div
                          className={`text-xs font-bold ${
                            isCurrent
                              ? "text-forest"
                              : isCompleted
                              ? "text-ink"
                              : "text-ink-soft"
                          }`}
                        >
                          {stg.label}
                        </div>
                        <div className="text-[10px] text-ink-soft leading-tight mt-0.5 hidden md:block">
                          {stg.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Vertical Stepper */}
              <div className="sm:hidden space-y-4">
                {STAGES.map((stg, idx) => {
                  const isCompleted = idx <= currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  return (
                    <div key={stg.key} className="flex items-start gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                          isCompleted
                            ? "bg-forest text-white"
                            : "bg-paper border border-line text-ink-soft"
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div>
                        <div
                          className={`text-xs font-bold ${
                            isCurrent ? "text-forest" : "text-ink"
                          }`}
                        >
                          {stg.label}
                        </div>
                        <div className="text-[11px] text-ink-soft">{stg.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Courier Partner Card if assigned */}
        {order.courierPartner && !isCancelled && (
          <div className="p-6 rounded-3xl bg-forest-soft border border-forest/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-forest text-white flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-forest">
                  {t("track.courierAssigned")}
                </span>
                <h4 className="font-bold text-base text-ink capitalize">
                  {order.courierPartner} Logistics
                </h4>
                {order.courierTrackingId && (
                  <p className="text-xs text-ink-soft font-mono mt-0.5">
                    Courier AWB: <strong>{order.courierTrackingId}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="text-xs text-forest font-semibold flex items-center gap-1.5">
              <span>Expected Delivery: 24-48 Hours</span>
            </div>
          </div>
        )}

        {/* 2-Column Delivery Details & Items Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Customer & Address Details */}
          <div className="bg-paper p-6 rounded-3xl border border-line shadow-card space-y-4">
            <h3 className="text-base font-bold font-display text-ink border-b border-line pb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-forest" />
              <span>{t("track.deliveryDetails")}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2 text-ink">
                <User className="w-4 h-4 text-ink-soft shrink-0 mt-0.5" />
                <div>
                  <strong>{order.customerName}</strong>
                </div>
              </div>

              <div className="flex items-start gap-2 text-ink">
                <Phone className="w-4 h-4 text-ink-soft shrink-0 mt-0.5" />
                <div className="font-mono">{order.customerPhone}</div>
              </div>

              <div className="flex items-start gap-2 text-ink">
                <MapPin className="w-4 h-4 text-ink-soft shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">{order.deliveryZone}</span>
                  <span className="text-ink-soft">{order.shippingAddress}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items In Parcel */}
          <div className="bg-paper p-6 rounded-3xl border border-line shadow-card space-y-4">
            <h3 className="text-base font-bold font-display text-ink border-b border-line pb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-forest" />
              <span>{t("track.parcelItems")} ({order.items?.length || 0})</span>
            </h3>

            <div className="divide-y divide-line space-y-2 text-xs">
              {order.items?.map((item: any) => (
                <div key={item.id} className="pt-2 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-ink">{item.productName}</div>
                    <div className="text-ink-soft font-mono">
                      {item.quantity} � {formatTaka(item.unitPrice)}
                    </div>
                  </div>
                  <span className="font-bold font-mono text-ink">
                    {formatTaka(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>

            {/* Separate Financial Calculation Breakdown */}
            <div className="pt-4 border-t border-line space-y-2 text-xs">
              <div className="flex justify-between text-ink-soft">
                <span>{locale === "bn" ? "পণ্যের মোট মূল্য (Subtotal)" : "Products Subtotal"}:</span>
                <span className="font-mono font-semibold text-ink">
                  {formatTaka(order.subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-ink-soft">
                <span>
                  {locale === "bn" ? "ডেলিভারি চার্জ" : "Delivery Charge"} ({order.deliveryZone || (locale === "bn" ? "স্ট্যান্ডার্ড" : "Standard")}):
                </span>
                <span className="font-mono font-semibold text-ink">
                  {Number(order.shippingFee) === 0 ? (
                    <span className="text-emerald-700 font-bold">{locale === "bn" ? "ফ্রি ডেলিভারি" : "FREE"}</span>
                  ) : (
                    formatTaka(order.shippingFee)
                  )}
                </span>
              </div>

              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>{locale === "bn" ? "ডিসকাউন্ট ছাড়" : "Discount"} ({order.promoCodeText || "Coupon"}):</span>
                  <span className="font-mono font-semibold">-{formatTaka(order.discountAmount)}</span>
                </div>
              )}

              {Number(order.coinsDiscount) > 0 && (
                <div className="flex justify-between text-amber-700 font-medium">
                  <span>{locale === "bn" ? "কয়েন ছাড়" : "Coins Discount"} ({order.coinsRedeemed || 0} Coins):</span>
                  <span className="font-mono font-semibold">-{formatTaka(order.coinsDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold text-ink pt-2.5 border-t border-line">
                <span className="text-forest font-display">{locale === "bn" ? "সর্বমোট প্রদেয় বিল" : "Net Total Amount"}:</span>
                <span className="font-mono text-forest text-base">{formatTaka(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Timeline Audit History */}
        {order.history && order.history.length > 0 && (
          <div className="bg-paper p-6 sm:p-8 rounded-3xl border border-line shadow-card space-y-4">
            <h3 className="text-base font-bold font-display text-ink border-b border-line pb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              <span>{t("track.activityHistory")}</span>
            </h3>

            <div className="space-y-4">
              {order.history.map((h: any) => (
                <div key={h.id} className="flex items-start gap-3 text-xs">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${h.status === "CANCELLED" ? "bg-rose-500" : "bg-forest"}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-bold ${h.status === "CANCELLED" ? "text-rose-700" : "text-ink"}`}>
                        {h.status}
                      </span>
                      <span className="text-[11px] text-ink-soft font-mono">
                        {new Date(h.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} � {new Date(h.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    {h.note && <p className="text-ink-soft mt-0.5">{h.note}</p>}
                    <div className="text-[10px] text-ink-soft font-mono mt-0.5">By: {h.actorName || h.actorRole}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Smart Confirmation Modal for Customer Self-Cancellation */}
      <ConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleSelfServiceCancel}
        title="Cancel This Order?"
        message={`Are you sure you want to cancel order #${order.orderNumber}?\n\n� Delivery will be stopped immediately.\n� All items will be released back into fresh store inventory.\n${order.paymentMethod !== "COD" ? "� Your online payment refund will be flagged for refund processing.\n" : ""}� You can place a new order at any time.`}
        confirmText="Yes, Cancel Order"
        cancelText="Keep My Order"
        type="danger"
        isLoading={cancelling}
      />

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />

      <StorefrontFooter />
    </div>
  );
}

export default function OrderTrackingPageWrapper(props: {
  params: Promise<{ trackingId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg text-forest font-medium">
          Loading order tracking...
        </div>
      }
    >
      <OrderTrackingDetailContent {...props} />
    </Suspense>
  );
}
