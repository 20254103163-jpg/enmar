"use client";
// app/admin/orders/page.tsx

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  Bike,
  Eye,
  RefreshCw,
  ExternalLink,
  MapPin,
  Phone,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  Loader2,
  Printer,
} from "lucide-react";
import { formatTaka } from "@/lib/utils";
import StatusBadge from "@/components/admin/StatusBadge";
import { OrderStatus } from "@prisma/client";
import { useLiveSync } from "@/lib/useLiveSync";
import AlertModal from "@/components/ui/AlertModal";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("ALL");

  // Selection state for Bulk Delete
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Single Delete state
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null);
  const [deletingSingle, setDeletingSingle] = useState(false);

  // Modals
  const [statusModalOrder, setStatusModalOrder] = useState<any | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<any | null>(null);
  const [cancelPreset, setCancelPreset] = useState<string>("Item out of stock");
  const [customCancelReason, setCustomCancelReason] = useState<string>("");
  const [cancellingOrder, setCancellingOrder] = useState<boolean>(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>("PENDING");
  const [courierPartner, setCourierPartner] = useState("");
  const [courierTrackingId, setCourierTrackingId] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [updating, setUpdating] = useState(false);

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

  const fetchOrders = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (activeTab !== "ALL") query.set("status", activeTab);

      const res = await fetch(`/api/admin/orders?${query.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    setSelectedIds([]);
  }, [search, activeTab]);

  useLiveSync(() => fetchOrders(true), { interval: 5000 });

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders;
  }, [orders]);

  // Toggle selection
  const toggleSelectOrder = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all visible
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOrders.map((o) => o.id));
    }
  };

  // Quick selectors for Delivered / Cancelled / Returned
  const selectByStatus = (statusGroup: string[]) => {
    const matchingIds = filteredOrders
      .filter((o) => statusGroup.includes(o.orderStatus))
      .map((o) => o.id);
    setSelectedIds(matchingIds);
  };

  // Execute Bulk Delete
  const handleExecuteBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/admin/orders/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete orders");

      setConfirmBulkDelete(false);
      setSelectedIds([]);
      await fetchOrders(false);

      setAlertState({
        isOpen: true,
        title: "Orders Deleted Successfully!",
        message: `${data.count || selectedIds.length} order(s) have been deleted from tracking history.`,
        type: "success",
      });
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        title: "Delete Failed",
        message: err.message,
        type: "error",
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  // Execute Single Delete
  const handleExecuteSingleDelete = async () => {
    if (!orderToDelete) return;
    setDeletingSingle(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete order");

      const deletedId = orderToDelete.id;
      setOrderToDelete(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deletedId));
      await fetchOrders(false);

      setAlertState({
        isOpen: true,
        title: "Order Deleted!",
        message: `Order #${orderToDelete.orderNumber} has been removed from tracking history.`,
        type: "success",
      });
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        title: "Delete Failed",
        message: err.message,
        type: "error",
      });
    } finally {
      setDeletingSingle(false);
    }
  };

  // Status update submit
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalOrder) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${statusModalOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderStatus: newStatus,
          courierPartner,
          courierTrackingId,
          statusNote,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to update status");

      setStatusModalOrder(null);
      await fetchOrders(false);
      setAlertState({
        isOpen: true,
        title: "Status Updated!",
        message: `Order #${statusModalOrder.orderNumber} status updated to ${newStatus}.`,
        type: "success",
      });
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        title: "Update Failed",
        message: err.message,
        type: "error",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Cancellation submit
  const handleAdminCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalOrder) return;
    setCancellingOrder(true);
    try {
      const finalReason = cancelPreset === "Other" ? customCancelReason : cancelPreset;
      const res = await fetch(`/api/admin/orders/${cancelModalOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderStatus: "CANCELLED",
          cancellationReason: finalReason || "Cancelled by Admin",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to cancel order");

      setCancelModalOrder(null);
      await fetchOrders(false);
      setAlertState({
        isOpen: true,
        title: "Order Cancelled!",
        message: `Order #${cancelModalOrder.orderNumber} has been cancelled and stock restored.`,
        type: "success",
      });
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        title: "Cancellation Failed",
        message: err.message,
        type: "error",
      });
    } finally {
      setCancellingOrder(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-paper p-4 rounded-2xl border border-line shadow-card">
        <div>
          <h1 className="text-xl font-bold font-display text-ink">Order Management</h1>
          <p className="text-xs text-ink-soft">
            Monitor real-time live customer orders, courier dispatch, and history purging.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, phone, tracking..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-bg border border-line text-xs w-56 sm:w-64 focus:outline-hidden"
            />
          </div>

          <button
            onClick={() => fetchOrders(false)}
            className="p-1.5 rounded-lg bg-bg border border-line hover:bg-stone-200 text-ink-soft hover:text-ink shadow-xs cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs & Quick Selection Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-paper p-2.5 rounded-2xl border border-line shadow-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 lg:pb-0">
          {[
            { key: "ALL", label: "All Orders" },
            { key: "AI_ORDERS", label: "🤖 AI Orders" },
            { key: "PENDING", label: "Pending" },
            { key: "CONFIRMED", label: "Confirmed" },
            { key: "PROCESSING", label: "Processing" },
            { key: "MAKING", label: "Making" },
            { key: "PACKED", label: "Packed" },
            { key: "SHIPPED", label: "Shipped" },
            { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
            { key: "DELIVERED", label: "Delivered" },
            { key: "CANCELLED", label: "Cancelled" },
            { key: "RETURNED", label: "Returned" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.key
                  ? "bg-forest text-white shadow-xs"
                  : "text-ink-soft hover:text-ink hover:bg-bg"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Quick Mark Buttons */}
        <div className="flex items-center gap-1.5 text-[10px] pt-1.5 lg:pt-0 border-t lg:border-t-0 border-line">
          <span className="text-ink-soft font-semibold">Mark:</span>
          <button
            onClick={() => selectByStatus(["DELIVERED"])}
            className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold transition-colors cursor-pointer"
          >
            Delivered
          </button>
          <button
            onClick={() => selectByStatus(["CANCELLED"])}
            className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 font-bold transition-colors cursor-pointer"
          >
            Cancelled
          </button>
          <button
            onClick={() => selectByStatus(["RETURNED"])}
            className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-bold transition-colors cursor-pointer"
          >
            Returned
          </button>
          <button
            onClick={() => selectByStatus(["DELIVERED", "CANCELLED", "RETURNED"])}
            className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 font-bold transition-colors cursor-pointer"
          >
            All Done
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-forest-soft border border-forest/20 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-forest" />
            <span className="text-xs font-bold text-forest">
              {selectedIds.length} orders selected
            </span>
          </div>
          <button
            onClick={() => setConfirmBulkDelete(true)}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Selected</span>
          </button>
        </div>
      )}

      {/* Orders Table Card */}
      <div className="bg-paper rounded-2xl border border-line shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-line bg-bg/60 text-ink-soft font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3 w-8 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="cursor-pointer text-forest hover:text-forest-deep"
                  >
                    {selectedIds.length === filteredOrders.length && filteredOrders.length > 0 ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4 text-ink-soft" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-3">Order / Tracking</th>
                <th className="py-2.5 px-3">Customer & Phone</th>
                <th className="py-2.5 px-3">Items & Total</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Courier / Rider</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>


            <tbody className="divide-y divide-line">
              {loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-soft">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-forest mb-2" />
                    <span>Loading orders...</span>
                  </td>
                </tr>
              )}

              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-soft">
                    <ShoppingBag className="w-8 h-8 mx-auto text-ink-soft/40 mb-2" />
                    <span>No orders found matching criteria.</span>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredOrders.map((order) => {
                  const isSelected = selectedIds.includes(order.id);
                  const isDeletable = ["DELIVERED", "CANCELLED", "RETURNED"].includes(order.orderStatus);
                  const isAiOrder = order.customerNotes?.includes("AI") || order.customerNotes?.includes("AI Customer Assistant");

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-bg/60 transition-colors ${
                        isSelected ? "bg-forest/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleSelectOrder(order.id)}
                          className="cursor-pointer text-forest hover:text-forest-deep"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-ink-soft" />
                          )}
                        </button>
                      </td>

                      {/* Order / Tracking */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="font-mono font-bold text-forest hover:underline"
                            >
                              #{order.orderNumber}
                            </Link>
                            {isAiOrder && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[9px]">
                                🤖 AI
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] text-ink-soft block">
                            {order.trackingId}
                          </p>
                          <span className="text-[10px] text-ink-soft block">
                            {new Date(order.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-ink">{order.customerName}</p>
                          <p className="font-mono text-[11px] text-ink-soft">{order.customerPhone}</p>
                          <p className="text-[10px] text-ink-soft truncate max-w-[140px]" title={order.shippingAddress}>
                            {order.shippingAddress}
                          </p>
                        </div>
                      </td>

                      {/* Items & Total */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold font-mono text-ink text-sm">
                            {formatTaka(order.totalAmount)}
                          </span>
                          <span className="text-[10px] text-ink-soft block">
                            {order.items?.length || order._count?.items || 0} item(s)
                          </span>
                        </div>
                      </td>

                      {/* Payment */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-bg border border-line">
                            {order.paymentMethod}
                          </span>
                          <span
                            className={`block text-[10px] font-bold ${
                              order.paymentStatus === "PAID"
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }`}
                          >
                            {order.paymentStatus}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={order.orderStatus} />
                      </td>

                      {/* Courier / Rider */}
                      <td className="py-3 px-4">
                        {order.deliveryPersonnel ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                            <Bike className="w-3.5 h-3.5 text-forest" />
                            <span>{order.deliveryPersonnel.name}</span>
                          </div>
                        ) : order.courierPartner ? (
                          <div className="flex items-center gap-1.5 text-xs text-ink-soft">
                            <Truck className="w-3.5 h-3.5" />
                            <span>{order.courierPartner}</span>
                          </div>
                        ) : (
                          <span className="text-ink-soft text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="p-1.5 inline-block rounded-lg bg-bg hover:bg-forest/10 hover:text-forest text-ink-soft transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        <Link
                          href={`/admin/orders/${order.id}/invoice`}
                          target="_blank"
                          className="p-1.5 inline-block rounded-lg bg-bg hover:bg-forest/10 hover:text-forest text-ink-soft transition-colors"
                          title="Print Invoice / Packing Slip"
                        >
                          <Printer className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => {
                            setStatusModalOrder(order);
                            setNewStatus(order.orderStatus);
                            setCourierPartner(order.courierPartner || "");
                            setCourierTrackingId(order.courierTrackingId || "");
                          }}
                          className="p-1.5 rounded-lg bg-bg hover:bg-forest/10 hover:text-forest text-ink-soft transition-colors cursor-pointer"
                          title="Update Status"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setOrderToDelete(order)}
                          className="p-1.5 rounded-lg bg-bg hover:bg-rose-50 hover:text-rose-600 text-ink-soft transition-colors cursor-pointer"
                          title="Delete / Purge Order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Sticky Bulk Delete Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-stone-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-5 border border-stone-700">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-5 h-5 rounded-full bg-forest text-accent font-bold flex items-center justify-center text-[10px]">
              {selectedIds.length}
            </span>
            <span className="font-bold">orders marked / selected</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              Clear
            </button>

            <button
              onClick={() => setConfirmBulkDelete(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected Orders ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm Modal */}
      <ConfirmModal
        isOpen={confirmBulkDelete}
        title="Delete Selected Orders?"
        message={`Are you sure you want to permanently delete ${selectedIds.length} marked order(s) and all their associated tracking history? This action cannot be undone.`}
        confirmText="Yes, Delete All Selected"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleExecuteBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
      />

      {/* Single Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!orderToDelete}
        title="Delete Order History?"
        message={`Are you sure you want to delete Order #${orderToDelete?.orderNumber} (${orderToDelete?.trackingId}) from tracking history?`}
        confirmText="Yes, Delete Order"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleExecuteSingleDelete}
        onClose={() => setOrderToDelete(null)}
      />

      {/* Status Update Modal */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-paper w-full max-w-md p-6 rounded-3xl border border-line shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-bold font-display text-ink text-base">Update Order Status</h3>
                <p className="text-xs font-mono text-ink-soft">#{statusModalOrder.orderNumber}</p>
              </div>
              <button
                onClick={() => setStatusModalOrder(null)}
                className="p-1 rounded-lg hover:bg-bg text-ink-soft"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-ink uppercase tracking-wider mb-1.5">
                  Order Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-line font-bold focus:outline-none focus:border-forest"
                >
                  <option value="PENDING">PENDING (অপেক্ষমান)</option>
                  <option value="CONFIRMED">CONFIRMED (নিশ্চিত)</option>
                  <option value="PROCESSING">PROCESSING (প্রক্রিয়াকরণ হচ্ছে)</option>
                  <option value="MAKING">MAKING (তৈরি হচ্ছে)</option>
                  <option value="PACKED">PACKED (প্যাকিং সম্পন্ন)</option>
                  <option value="SHIPPED">SHIPPED (কুরিয়ারে হস্তান্তর)</option>
                  <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY (ডেলিভারির পথে)</option>
                  <option value="DELIVERED">DELIVERED (সফল ডেলিভারি)</option>
                  <option value="CANCELLED">CANCELLED (বাতিল)</option>
                  <option value="RETURNED">RETURNED (রিটার্ন)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-ink uppercase tracking-wider mb-1.5">
                  Courier Partner (Optional)
                </label>
                <input
                  type="text"
                  value={courierPartner}
                  onChange={(e) => setCourierPartner(e.target.value)}
                  placeholder="e.g. Pathao, Steadfast, In-House"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-line focus:outline-none focus:border-forest"
                />
              </div>

              <div>
                <label className="block font-bold text-ink uppercase tracking-wider mb-1.5">
                  Courier Tracking ID (AWB)
                </label>
                <input
                  type="text"
                  value={courierTrackingId}
                  onChange={(e) => setCourierTrackingId(e.target.value)}
                  placeholder="e.g. PTH-892301"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-line font-mono focus:outline-none focus:border-forest"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalOrder(null)}
                  className="flex-1 py-2.5 rounded-xl bg-bg border border-line font-bold hover:bg-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-2.5 rounded-xl bg-forest hover:bg-forest-deep text-white font-bold shadow-xs flex items-center justify-center gap-2"
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={() => setAlertState({ ...alertState, isOpen: false })}
      />
    </div>
  );
}
