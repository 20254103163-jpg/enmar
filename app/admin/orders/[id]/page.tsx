"use client";
import AlertModal from "@/components/ui/AlertModal";
// app/admin/orders/[id]/page.tsx

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Bike,
  Radio,
  Truck,
  User,
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  Package,
  Calendar,
  Save,
  Loader2,
  Tag,
} from "lucide-react";
import { formatTaka } from "@/lib/utils";
import StatusBadge from "@/components/admin/StatusBadge";
import { OrderStatus, PaymentStatus } from "@prisma/client";

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: "success" | "error" | "warning" | "info" }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const [orderStatus, setOrderStatus] = useState<OrderStatus>("PENDING");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PENDING");
  const [courierPartner, setCourierPartner] = useState("");
  const [courierTrackingId, setCourierTrackingId] = useState("");
  const [riders, setRiders] = useState<any[]>([]);
  const [deliveryPersonnelId, setDeliveryPersonnelId] = useState<string>("");
  const [statusNote, setStatusNote] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelPreset, setCancelPreset] = useState("Item out of stock");
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [cancellingOrder, setCancellingOrder] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      const json = await res.json();
      if (json.success) {
        const o = json.order;
        setOrder(o);
        setOrderStatus(o.orderStatus);
        setPaymentStatus(o.paymentStatus);
        setCourierPartner(o.courierPartner || "");
        setCourierTrackingId(o.courierTrackingId || "");
        setAdminNotes(o.adminNotes || "");
        setDeliveryPersonnelId(o.deliveryPersonnelId ? String(o.deliveryPersonnelId) : "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    fetch("/api/admin/delivery-personnel")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setRiders(data.riders || []);
      })
      .catch(() => {});
  }, [id]);

  const handleAdminCancel = async () => {
    const finalReason = cancelPreset === "CUSTOM" ? customCancelReason.trim() : cancelPreset;
    if (!finalReason) {
      setAlertState({
        isOpen: true,
        title: "Cancellation Reason Required",
        message: "Please specify a cancellation reason.",
        type: "warning",
      });
      return;
    }

    setCancellingOrder(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderStatus: "CANCELLED",
          cancellationReason: finalReason,
          statusNote: finalReason,
          actorRole: "ADMIN",
          actorName: "Abu Hourira (Admin)",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to cancel order.");

      setShowCancelModal(false);
      setCustomCancelReason("");
      fetchOrder();
      setAlertState({
        isOpen: true,
        title: "Order Cancelled",
        message: "Order has been cancelled, inventory restored, and customer notified.",
        type: "success",
      });
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        title: "Cancellation Error",
        message: err.message || "Failed to cancel order.",
        type: "error",
      });
    } finally {
      setCancellingOrder(false);
    }
  };

  const handleMarkRefunded = async () => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refundStatus: "REFUNDED",
          paymentStatus: "REFUNDED",
          statusNote: "Refund processed and settled with customer.",
          actorRole: "ADMIN",
          actorName: "Abu Hourira (Admin)",
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchOrder();
        setAlertState({
          isOpen: true,
          title: "Refund Settled",
          message: "Order marked as refunded successfully.",
          type: "success",
        });
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderStatus,
          paymentStatus,
          deliveryPersonnelId: deliveryPersonnelId || null,
          courierPartner,
          courierTrackingId,
          adminNotes,
          statusNote: statusNote || `Status updated to ${orderStatus}`,
          actorRole: "ADMIN",
          actorName: "Abu Hourira (Admin)",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Update failed");

      setStatusNote("");
      fetchOrder();
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        title: "Order Update Error",
        message: err.message || "Failed to update order status.",
        type: "error",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-ink-soft">
        <Loader2 className="w-8 h-8 animate-spin text-forest" />
        <span className="ml-3 font-medium">Loading order details...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-24">
        <p className="text-lg font-bold text-ink">Order not found</p>
        <Link href="/admin/orders" className="text-sm text-forest hover:underline mt-2 inline-block">
          Return to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-2 rounded-xl border border-line bg-paper text-ink-soft hover:text-ink hover:bg-bg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold font-display text-ink">
                Order #{order.orderNumber}
              </h2>
              <StatusBadge status={order.orderStatus} />
            </div>
            <p className="text-xs text-ink-soft mt-1">
              Customer Tracking ID:{" "}
              <span className="font-mono font-bold text-forest bg-forest-soft px-2 py-0.5 rounded">
                {order.trackingId}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {order.refundStatus === "REFUND_NEEDED" && (
            <button
              type="button"
              onClick={handleMarkRefunded}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              Mark Refund Settled
            </button>
          )}
          {order.orderStatus !== "CANCELLED" && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              Cancel Order
            </button>
          )}
          <Link
            href={`/admin/orders/${order.id}/label`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-forest/30 bg-forest-soft text-forest hover:bg-forest hover:text-white text-sm font-semibold transition-colors shadow-xs"
          >
            <Tag className="w-4 h-4" />
            <span>Shipping Label (2&quot;&times;3&quot;)</span>
          </Link>
          <Link
            href={`/admin/orders/${order.id}/invoice`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-line bg-paper text-ink hover:bg-bg text-sm font-semibold transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4 text-ink-soft" />
            <span>Print Invoice / Slip</span>
          </Link>
        </div>
      </div>

      {/* Cancelled Banner if cancelled */}
      {order.orderStatus === "CANCELLED" && (
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-rose-800">
              Order Status: CANCELLED
            </h3>
            {order.refundStatus === "REFUND_NEEDED" && (
              <span className="px-3 py-1 rounded-full bg-rose-200 text-rose-900 text-xs font-bold animate-pulse">
                REFUND NEEDED
              </span>
            )}
            {order.refundStatus === "REFUNDED" && (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
                REFUND SETTLED
              </span>
            )}
          </div>
          {order.cancellationReason && (
            <p className="text-xs text-rose-800">
              <strong>Cancellation Reason:</strong> {order.cancellationReason}
            </p>
          )}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Items & Order Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Purchased Items Card */}
          <div className="bg-paper p-6 rounded-3xl border border-line shadow-card space-y-4">
            <h3 className="text-lg font-bold font-display text-ink border-b border-line pb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-forest" />
              <span>Purchased Organic Items ({order.items?.length || 0})</span>
            </h3>

            <div className="divide-y divide-line">
              {order.items?.map((item: any) => (
                <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-sm text-ink">{item.productName}</div>
                    <div className="text-xs text-ink-soft">
                      {formatTaka(item.unitPrice)} × {item.quantity} {item.unit}
                    </div>
                  </div>
                  <div className="font-bold font-mono text-sm text-ink">
                    {formatTaka(item.totalPrice)}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="pt-4 border-t border-line space-y-2 text-sm">
              <div className="flex items-center justify-between text-ink-soft">
                <span>Products Price (Subtotal)</span>
                <span className="font-mono font-semibold text-ink">{formatTaka(order.subtotal)}</span>
              </div>

              {Number(order.discountAmount) > 0 && (
                <div className="flex items-center justify-between text-emerald-700 font-medium">
                  <span>Discount Applied ({order.promoCodeText || "Coupon"})</span>
                  <span className="font-mono">-{formatTaka(order.discountAmount)}</span>
                </div>
              )}

              {Number(order.coinsDiscount) > 0 && (
                <div className="flex items-center justify-between text-amber-700 font-medium">
                  <span>Coins Discount ({order.coinsRedeemed || 0} Coins)</span>
                  <span className="font-mono">-{formatTaka(order.coinsDiscount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-ink-soft">
                <span>Delivery Charge ({order.deliveryZone || "Standard"})</span>
                <span className="font-mono font-semibold text-ink">
                  {Number(order.shippingFee) === 0 ? "FREE (৳0)" : formatTaka(order.shippingFee)}
                </span>
              </div>

              <div className="flex items-center justify-between text-base font-bold text-ink pt-2 border-t border-line">
                <span>Total Amount Due</span>
                <span className="font-mono text-forest text-lg">
                  {formatTaka(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Order Tracking Timeline */}
          <div className="bg-paper p-6 rounded-3xl border border-line shadow-card space-y-4">
            <h3 className="text-lg font-bold font-display text-ink border-b border-line pb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              <span>Live Tracking Stage Timeline</span>
            </h3>

            <div className="space-y-4 pt-2">
              {order.history?.length === 0 ? (
                <p className="text-xs text-ink-soft">Initial stage recorded at checkout.</p>
              ) : (
                order.history?.map((h: any, i: number) => (
                  <div key={h.id} className="relative pl-6 pb-4 border-l-2 border-forest/20 last:border-l-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-forest text-white flex items-center justify-center text-[9px] font-bold">
                      ✓
                    </div>
                    <div className="flex items-center justify-between">
                      <StatusBadge status={h.status} size="sm" />
                      <span className="text-[11px] text-ink-soft">
                        {new Date(h.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-ink mt-1.5">{h.note}</p>
                    <p className="text-[10px] text-ink-soft mt-0.5">By {h.actorName} ({h.actorRole})</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Stage Updater & Customer Card */}
        <div className="space-y-6">
          {/* Status Updater Form */}
          <div className="bg-paper p-6 rounded-3xl border border-line shadow-card space-y-4">
            <h3 className="text-lg font-bold font-display text-ink border-b border-line pb-3">
              Update Order Status
            </h3>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-ink">Order Stage</label>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                  className="w-full px-4 py-2.5 rounded-xl bg-bg border border-line text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-forest/20"
                >
                  <option value="PENDING">Pending (অপেক্ষমান)</option>
                  <option value="CONFIRMED">Confirmed (নিশ্চিত)</option>
                  <option value="PROCESSING">Processing (প্রক্রিয়াকরণ হচ্ছে)</option>
                  <option value="MAKING">Making (তৈরি হচ্ছে)</option>
                  <option value="PACKED">Packed (প্যাকিং সম্পন্ন)</option>
                  <option value="SHIPPED">Shipped (Handed to Courier)</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery (ডেলিভারির পথে)</option>
                  <option value="DELIVERED">Delivered (ডেলিভারি সম্পন্ন)</option>
                  <option value="CANCELLED">Cancelled (বাতিল)</option>
                  <option value="RETURNED">Returned (রিটার্ন)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-ink">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full px-4 py-2 rounded-xl bg-bg border border-line text-sm font-medium focus:outline-none focus:ring-2 focus:ring-forest/20"
                >
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-ink">Assign Delivery Rider</label>
                  <Link href="/admin/delivery" className="text-[11px] text-forest hover:underline">
                    Manage Fleet →
                  </Link>
                </div>
                <select
                  value={deliveryPersonnelId}
                  onChange={(e) => setDeliveryPersonnelId(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-bg border border-line text-sm font-medium focus:outline-none focus:ring-2 focus:ring-forest/20"
                >
                  <option value="">-- No In-House Rider Assigned --</option>
                  {riders.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.phone}) - {r.vehicleType} {r.isSharingLocation ? "🟢 (Live GPS)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-ink">Courier Partner</label>
                <input
                  type="text"
                  placeholder="Pathao, Steadfast, RedX"
                  value={courierPartner}
                  onChange={(e) => setCourierPartner(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-bg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-ink">Courier Tracking #</label>
                <input
                  type="text"
                  placeholder="e.g. PTH-984392"
                  value={courierTrackingId}
                  onChange={(e) => setCourierTrackingId(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-bg border border-line text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-ink">Status Change Audit Note</label>
                <input
                  type="text"
                  placeholder="Reason for change..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-bg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full py-2.5 rounded-xl bg-forest hover:bg-forest-deep text-white font-semibold text-sm shadow-premium transition-colors disabled:opacity-50"
              >
                {updating ? "Saving..." : "Save Stage & Sync"}
              </button>
            </form>
          </div>

          {/* Customer & Shipping Details */}
          <div className="bg-paper p-6 rounded-3xl border border-line shadow-card space-y-4">
            <h3 className="text-lg font-bold font-display text-ink border-b border-line pb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-forest" />
              <span>Customer Details</span>
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-ink-soft block">Recipient Name</span>
                <span className="font-semibold text-ink">{order.customerName}</span>
              </div>

              <div>
                <span className="text-xs text-ink-soft block">Phone Number</span>
                <a href={`tel:${order.customerPhone}`} className="font-mono text-forest font-semibold hover:underline">
                  {order.customerPhone}
                </a>
              </div>

              <div>
                <span className="text-xs text-ink-soft block">Email</span>
                <span className="text-ink">{order.customerEmail}</span>
              </div>

              <div>
                <span className="text-xs text-ink-soft block">Delivery Destination</span>
                <p className="text-xs text-ink mt-0.5 leading-relaxed bg-bg p-3 rounded-xl border border-line">
                  {order.shippingAddress}
                </p>
              </div>

              {order.customerNotes && (
                <div>
                  <span className="text-xs text-ink-soft block">Customer Note</span>
                  <p className="text-xs text-ink-soft italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-200">
                    "{order.customerNotes}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-paper rounded-3xl border border-line shadow-2xl p-6 sm:p-7 max-w-md w-full space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold font-display text-lg text-rose-700">
                  Cancel Order #{order.orderNumber}
                </h3>
                <p className="text-xs text-ink-soft">
                  Tracking: <strong className="font-mono text-ink">{order.trackingId}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="p-1.5 rounded-xl text-ink-soft hover:text-ink hover:bg-bg"
              >
                ?
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <strong>Impact Summary:</strong>
              <p>� Inventory stock will be restored for all {order.items?.length || 0} item(s).</p>
              <p>� {order.paymentMethod !== "COD" ? "Online payment will be flagged as REFUND NEEDED." : "COD order � no refund required."}</p>
              <p>� Customer will receive an SMS & Email notification with the reason.</p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block font-semibold text-ink">
                Select Cancellation Reason:
              </label>
              <div className="space-y-2">
                {[
                  "Item out of stock",
                  "Unable to verify order details",
                  "Delivery area not serviceable",
                  "Customer requested cancellation",
                  "CUSTOM",
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      cancelPreset === reason
                        ? "bg-rose-50 border-rose-300 text-rose-900 font-semibold"
                        : "bg-bg border-line text-ink hover:border-forest/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReasonDetail"
                      value={reason}
                      checked={cancelPreset === reason}
                      onChange={() => setCancelPreset(reason)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>{reason === "CUSTOM" ? "Other Custom Reason..." : reason}</span>
                  </label>
                ))}
              </div>

              {cancelPreset === "CUSTOM" && (
                <div className="space-y-1 pt-1">
                  <label className="block text-[11px] font-semibold text-ink">
                    Type Specific Reason:
                  </label>
                  <textarea
                    rows={2}
                    value={customCancelReason}
                    onChange={(e) => setCustomCancelReason(e.target.value)}
                    placeholder="Enter detailed reason..."
                    className="w-full px-3.5 py-2 rounded-xl bg-bg border border-line text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={cancellingOrder}
                className="px-4 py-2.5 rounded-xl border border-line text-xs font-semibold text-ink-soft hover:bg-bg"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleAdminCancel}
                disabled={cancellingOrder}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {cancellingOrder ? "Processing..." : "Confirm & Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />
    </div>
  );
}
