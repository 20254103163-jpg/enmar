"use client";

// app/admin/page.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  AlertTriangle,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle2,
  RefreshCw,
  Boxes,
  Truck,
  TicketPercent,
  Users,
  Coins,
  Download,
  Search,
  Filter,
  Calendar,
  Sparkles,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import { formatTaka } from "@/lib/utils";
import StatusBadge from "@/components/admin/StatusBadge";
import { useLiveSync } from "@/lib/useLiveSync";

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Financial scope: "ACTIVE" (all in-flight & delivered orders) or "DELIVERED" (completed only)
  const [financialScope, setFinancialScope] = useState<"ACTIVE" | "DELIVERED">("ACTIVE");

  // Daily report filters
  const [rangeFilter, setRangeFilter] = useState<"all" | "30" | "14" | "7" | "1">("all");
  const [dateSearch, setDateSearch] = useState("");

  const fetchStats = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      const json = await res.json();
      if (json.success) {
        setData(json.stats);
      }
    } catch (e) {
      console.error("Failed to load dashboard stats:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(false);
  }, []);

  // Real-time live sync every 5 seconds for orders, revenue, and low stock alerts
  useLiveSync(() => fetchStats(true), { interval: 5000 });

  // Select financial figures based on chosen scope
  const financials =
    financialScope === "DELIVERED"
      ? data?.deliveredFinancials || {
          productSales: 0,
          deliveryFees: 0,
          discounts: 0,
          totalRevenue: 0,
          cost: 0,
          profit: 0,
          profitMargin: 0,
          ordersCount: 0,
        }
      : data?.financials || {
          productSales: 0,
          deliveryFees: 0,
          discounts: 0,
          totalRevenue: 0,
          cost: 0,
          profit: 0,
          profitMargin: 0,
          ordersCount: 0,
        };

  // Filter daily breakdown list
  const dailyList = (data?.dailyBreakdown || []).filter((row: any) => {
    // Range filter
    if (rangeFilter !== "all") {
      const days = parseInt(rangeFilter, 10);
      const rowDate = new Date(`${row.date}T00:00:00+06:00`);
      const cutOff = new Date();
      cutOff.setDate(cutOff.getDate() - days);
      if (rowDate < cutOff) return false;
    }
    // Search filter
    if (dateSearch.trim()) {
      const q = dateSearch.trim().toLowerCase();
      const matchesDate = row.date?.toLowerCase().includes(q);
      const matchesDisplay = row.displayDate?.toLowerCase().includes(q);
      const matchesLabel = row.dayLabel?.toLowerCase().includes(q);
      if (!matchesDate && !matchesDisplay && !matchesLabel) return false;
    }
    return true;
  });

  // Calculate totals for filtered daily rows
  const filteredTotals = dailyList.reduce(
    (acc: any, r: any) => ({
      ordersCount: acc.ordersCount + (r.ordersCount || 0),
      productSales: acc.productSales + (r.productSales || 0),
      deliveryFees: acc.deliveryFees + (r.deliveryFees || 0),
      discounts: acc.discounts + (r.discounts || 0),
      totalRevenue: acc.totalRevenue + (r.totalRevenue || 0),
      cost: acc.cost + (r.cost || 0),
      profit: acc.profit + (r.profit || 0),
    }),
    {
      ordersCount: 0,
      productSales: 0,
      deliveryFees: 0,
      discounts: 0,
      totalRevenue: 0,
      cost: 0,
      profit: 0,
    }
  );

  const filteredProfitMargin =
    filteredTotals.productSales > 0
      ? Math.round((filteredTotals.profit / filteredTotals.productSales) * 1000) / 10
      : 0;

  // Export filtered daily report as CSV
  const exportDailyReportCSV = () => {
    if (!dailyList || dailyList.length === 0) return;
    const headers = [
      "Date",
      "Day",
      "Orders Count",
      "Product Sales (BDT)",
      "Delivery Fee (BDT)",
      "Discounts (BDT)",
      "Total Revenue (BDT)",
      "Cost (BDT)",
      "Net Profit (BDT)",
      "Profit Margin (%)",
    ];

    const rows = dailyList.map((r: any) => [
      r.date,
      `"${r.dayLabel || ""}"`,
      r.ordersCount,
      r.productSales,
      r.deliveryFees,
      r.discounts,
      r.totalRevenue,
      r.cost,
      r.profit,
      `${r.profitMargin}%`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e: any[]) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `enmar-daily-financial-report-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-paper p-3.5 sm:p-4 rounded-2xl border border-line shadow-card">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync Active
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold font-display text-ink truncate">
            এডমিন ড্যাশবোর্ড ও আর্থিক হিসাব (Overview)
          </h2>
          <p className="text-xs text-ink-soft truncate">
            মূল পণ্যের বিক্রয়, ডেলিভারি চার্জ, আনুমানিক লাভ এবং প্রতিদিনের পুঙ্খানুপুঙ্খ বিবরণী
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchStats(false)}
            className="p-2 rounded-lg border border-line hover:bg-bg text-ink-soft hover:text-ink transition-colors cursor-pointer"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forest hover:bg-forest-deep text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>নতুন প্রোডাক্ট</span>
          </Link>
        </div>
      </div>

      {/* Financial Scope Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-paper/80 backdrop-blur-xs p-2.5 sm:px-3.5 rounded-xl border border-line">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-forest shrink-0" />
          <span className="text-xs font-bold text-ink">হিসাবের আওতা (Scope):</span>
          <span className="text-[11px] text-ink-soft hidden md:inline">
            ড্যাশবোর্ডের মোট অঙ্কের হিসাব নির্বাচন করুন
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-bg p-1 rounded-lg border border-line shrink-0">
          <button
            onClick={() => setFinancialScope("ACTIVE")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              financialScope === "ACTIVE"
                ? "bg-forest text-white shadow-xs"
                : "text-ink-soft hover:text-ink hover:bg-paper"
            }`}
          >
            সকল সচল অর্ডার ({data?.financials?.ordersCount || 0})
          </button>
          <button
            onClick={() => setFinancialScope("DELIVERED")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              financialScope === "DELIVERED"
                ? "bg-forest text-white shadow-xs"
                : "text-ink-soft hover:text-ink hover:bg-paper"
            }`}
          >
            শুধু ডেলিভার্ড সম্পন্ন ({data?.deliveredFinancials?.ordersCount || 0})
          </button>
        </div>
      </div>

      {/* 4 PRIMARY FINANCIAL METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Main Product Gross Sales */}
        <div className="p-4 rounded-2xl bg-paper border border-line shadow-card space-y-2 hover:border-forest/40 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                মূল পণ্য বিক্রয় (Subtotal)
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-ink tracking-tight">
              {loading ? "..." : formatTaka(financials.productSales)}
            </div>
            <p className="text-[11px] text-ink-soft mt-1 flex items-center gap-1">
              <span className="text-emerald-700 font-semibold">পণ্য বিক্রয়মূল্য</span>
              <span>(ডেলিভারি চার্জ ব্যতীত)</span>
            </p>
          </div>
        </div>

        {/* Card 2: Total Delivery Charge */}
        <div className="p-4 rounded-2xl bg-paper border border-line shadow-card space-y-2 hover:border-blue-400/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                মোট ডেলিভারি চার্জ
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-blue-800 tracking-tight">
              {loading ? "..." : formatTaka(financials.deliveryFees)}
            </div>
            <p className="text-[11px] text-ink-soft mt-1 flex items-center gap-1">
              <span className="text-blue-700 font-semibold">শিপিং ফি বাবদ আদায়</span>
              <span>(গ্রাহক থেকে)</span>
            </p>
          </div>
        </div>

        {/* Card 3: Total Customer Revenue (Product + Shipping - Discount) */}
        <div className="p-4 rounded-2xl bg-paper border border-line shadow-card space-y-2 hover:border-purple-400/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                সর্বমোট আদায় (Total Revenue)
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-purple-900 tracking-tight">
              {loading ? "..." : formatTaka(financials.totalRevenue)}
            </div>
            <p className="text-[11px] text-ink-soft mt-1 flex items-center gap-1">
              <span className="text-purple-700 font-semibold">মোট প্রাপ্তি</span>
              <span>(পণ্য + ডেলিভারি - ছাড়)</span>
            </p>
          </div>
        </div>

        {/* Card 4: Net Estimated Profit & Margin */}
        <div className="p-4 rounded-2xl bg-paper border border-line shadow-card space-y-2 hover:border-amber-400/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                মোট আনুমানিক লাভ (Profit)
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-emerald-800 tracking-tight flex items-baseline gap-2">
              <span>{loading ? "..." : formatTaka(financials.profit)}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold font-sans">
                {financials.profitMargin}%
              </span>
            </div>
            <p className="text-[11px] text-ink-soft mt-1 flex items-center gap-1">
              <span className="text-amber-800 font-semibold">নিট মুনাফা</span>
              <span>(কাঁচামাল/উৎপাদন খরচ বাদে)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Financial Summary Details Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-paper p-3 rounded-xl border border-line text-xs">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-ink-soft">মোট ছাড় / কুপন</span>
          <span className="font-mono font-bold text-rose-700 mt-0.5">
            - {loading ? "..." : formatTaka(financials.discounts || 0)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-ink-soft">
            কাঁচামাল ও উৎপাদন খরচ
          </span>
          <span className="font-mono font-bold text-ink mt-0.5">
            {loading ? "..." : formatTaka(financials.cost || 0)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-ink-soft">মোট অর্ডার সংখ্যা</span>
          <span className="font-mono font-bold text-ink mt-0.5">
            {loading ? "..." : `${financials.ordersCount} টি`}
            {data?.pendingOrders > 0 && (
              <span className="text-[10px] text-amber-600 font-sans ml-1 font-normal">
                ({data.pendingOrders} টি পেন্ডিং)
              </span>
            )}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-ink-soft">গড় মুনাফার হার</span>
          <span className="font-mono font-bold text-emerald-700 mt-0.5">
            {loading ? "..." : `${financials.profitMargin}%`}
          </span>
        </div>
      </div>

      {/* Quick Navigation Action Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <Link
          href="/admin/orders"
          className="p-2.5 rounded-xl bg-paper border border-line hover:border-forest/40 hover:bg-forest-soft/30 transition-all text-center flex flex-col items-center gap-1 shadow-xs group"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-bold text-ink leading-tight">Orders</span>
          <span className="text-[9px] text-ink-soft">{data?.pendingOrders || 0} Pending</span>
        </Link>

        <Link
          href="/admin/products"
          className="p-2.5 rounded-xl bg-paper border border-line hover:border-forest/40 hover:bg-forest-soft/30 transition-all text-center flex flex-col items-center gap-1 shadow-xs group"
        >
          <div className="w-7 h-7 rounded-lg bg-forest-soft text-forest flex items-center justify-center group-hover:scale-105 transition-transform">
            <Package className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-bold text-ink leading-tight">Products</span>
          <span className="text-[9px] text-ink-soft">{data?.totalProducts || 0} Items</span>
        </Link>

        <Link
          href="/admin/inventory"
          className="p-2.5 rounded-xl bg-paper border border-line hover:border-forest/40 hover:bg-forest-soft/30 transition-all text-center flex flex-col items-center gap-1 shadow-xs group"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Boxes className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-bold text-ink leading-tight">Stock</span>
          <span className="text-[9px] text-amber-700 font-semibold">{data?.lowStockCount || 0} Low</span>
        </Link>

        <Link
          href="/admin/materials"
          className="p-2.5 rounded-xl bg-paper border border-line hover:border-forest/40 hover:bg-forest-soft/30 transition-all text-center flex flex-col items-center gap-1 shadow-xs group"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-bold text-ink leading-tight">কাঁচামাল ও রেসিপি</span>
          <span className="text-[9px] text-emerald-700 font-semibold">BOM / খরচ</span>
        </Link>

        <Link
          href="/admin/delivery"
          className="p-2.5 rounded-xl bg-paper border border-line hover:border-forest/40 hover:bg-forest-soft/30 transition-all text-center flex flex-col items-center gap-1 shadow-xs group"
        >
          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Truck className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-bold text-ink leading-tight">Delivery</span>
          <span className="text-[9px] text-ink-soft">Fleet / Rider</span>
        </Link>

        <Link
          href="/admin/customers"
          className="p-2.5 rounded-xl bg-paper border border-line hover:border-forest/40 hover:bg-forest-soft/30 transition-all text-center flex flex-col items-center gap-1 shadow-xs group"
        >
          <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Users className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-bold text-ink leading-tight">Customers</span>
          <span className="text-[9px] text-ink-soft">CRM / LTV</span>
        </Link>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION: DAILY BREAKDOWN REPORT (প্রতিদিনের বিক্রয়, ডেলিভারি চার্জ ও লাভের বিস্তারিত বিবরণী)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-paper rounded-2xl border border-line shadow-card overflow-hidden">
        {/* Header & Controls Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-line flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-forest" />
              <h3 className="text-sm sm:text-base font-bold font-display text-ink">
                প্রতিদিনের বিক্রয়, ডেলিভারি চার্জ ও লাভ (Daily Breakdown)
              </h3>
            </div>
            <p className="text-[11px] text-ink-soft mt-0.5">
              প্রতিদিনের মূল পণ্য বিক্রয়, ডেলিভারি চার্জ, মোট আদায় ও আনুমানিক নিট লাভের দিনভিত্তিক হিসাব
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range Selector Pills */}
            <div className="flex items-center gap-1 bg-bg p-1 rounded-lg border border-line">
              <button
                onClick={() => setRangeFilter("all")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  rangeFilter === "all"
                    ? "bg-forest text-white font-bold"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                সব সময়
              </button>
              <button
                onClick={() => setRangeFilter("30")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  rangeFilter === "30"
                    ? "bg-forest text-white font-bold"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                গত ৩০ দিন
              </button>
              <button
                onClick={() => setRangeFilter("14")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  rangeFilter === "14"
                    ? "bg-forest text-white font-bold"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                গত ১৪ দিন
              </button>
              <button
                onClick={() => setRangeFilter("7")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  rangeFilter === "7"
                    ? "bg-forest text-white font-bold"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                গত ৭ দিন
              </button>
              <button
                onClick={() => setRangeFilter("1")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  rangeFilter === "1"
                    ? "bg-forest text-white font-bold"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                আজ
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="text"
                placeholder="তারিখ খুঁজুন..."
                value={dateSearch}
                onChange={(e) => setDateSearch(e.target.value)}
                className="pl-8 pr-2.5 py-1 text-xs rounded-lg border border-line bg-bg focus:outline-hidden focus:border-forest text-ink w-32 sm:w-36"
              />
            </div>

            {/* CSV Export Button */}
            <button
              onClick={exportDailyReportCSV}
              disabled={dailyList.length === 0}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-line bg-bg hover:bg-forest-soft hover:text-forest text-ink text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              title="CSV এক্সেল শীট হিসেবে ডাউনলোড করুন"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Selected Period Summary Bar */}
        <div className="bg-bg/60 px-3.5 py-2.5 border-b border-line grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-ink-soft">নির্বাচিত দিন</span>
            <div className="font-mono font-bold text-ink mt-0.5">{dailyList.length} দিন</div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-ink-soft">মোট অর্ডার</span>
            <div className="font-mono font-bold text-ink mt-0.5">{filteredTotals.ordersCount} টি</div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-ink-soft">মূল পণ্য বিক্রয়</span>
            <div className="font-mono font-bold text-emerald-800 mt-0.5">
              {formatTaka(filteredTotals.productSales)}
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-ink-soft">ডেলিভারি চার্জ</span>
            <div className="font-mono font-bold text-blue-700 mt-0.5">
              {formatTaka(filteredTotals.deliveryFees)}
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-ink-soft">সর্বমোট আদায়</span>
            <div className="font-mono font-bold text-purple-900 mt-0.5">
              {formatTaka(filteredTotals.totalRevenue)}
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-ink-soft">মোট নিট লাভ</span>
            <div className="font-mono font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
              <span>{formatTaka(filteredTotals.profit)}</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-sans">
                {filteredProfitMargin}%
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg/90 text-ink-soft text-[10px] uppercase tracking-wider border-b border-line">
              <tr>
                <th className="py-2.5 px-3">তারিখ (Date)</th>
                <th className="py-2.5 px-3 text-center">অর্ডার সংখ্যা</th>
                <th className="py-2.5 px-3">মূল পণ্য বিক্রয় (Subtotal)</th>
                <th className="py-2.5 px-3">ডেলিভারি চার্জ (Shipping)</th>
                <th className="py-2.5 px-3">ডিসকাউন্ট</th>
                <th className="py-2.5 px-3">সর্বমোট আদায় (Total)</th>
                <th className="py-2.5 px-3">কাঁচামাল খরচ</th>
                <th className="py-2.5 px-3">নিট লাভ (Profit)</th>
                <th className="py-2.5 px-3 text-right">মার্জিন (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-ink-soft">
                    প্রতিদিনের হিসাব লোড হচ্ছে...
                  </td>
                </tr>
              ) : dailyList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-ink-soft">
                    কোনো দিনের তথ্য পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                dailyList.map((row: any) => (
                  <tr key={row.date} className="hover:bg-bg/40 transition-colors">
                    {/* Date */}
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-ink flex items-center gap-1.5">
                        <span>{row.displayDate}</span>
                        {row.dayLabel && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                              row.dayLabel.includes("আজ")
                                ? "bg-emerald-100 text-emerald-800 font-bold"
                                : row.dayLabel.includes("গতকাল")
                                ? "bg-amber-100 text-amber-800 font-semibold"
                                : "bg-bg text-ink-soft border border-line"
                            }`}
                          >
                            {row.dayLabel}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-ink-soft">{row.date}</div>
                    </td>

                    {/* Orders count */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-bg border border-line text-xs font-mono font-bold text-ink">
                        {row.ordersCount} টি
                      </span>
                    </td>

                    {/* Main Product Sales */}
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-900 text-xs">
                      {formatTaka(row.productSales)}
                    </td>

                    {/* Delivery Fee */}
                    <td className="py-2.5 px-3 font-mono text-xs text-blue-700">
                      {row.deliveryFees > 0 ? (
                        <span className="font-bold">+{formatTaka(row.deliveryFees)}</span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>

                    {/* Discounts */}
                    <td className="py-2.5 px-3 font-mono text-xs text-rose-700">
                      {row.discounts > 0 ? (
                        <span>-{formatTaka(row.discounts)}</span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>

                    {/* Total Revenue */}
                    <td className="py-2.5 px-3 font-mono font-black text-ink text-xs">
                      {formatTaka(row.totalRevenue)}
                    </td>

                    {/* Production Cost */}
                    <td className="py-2.5 px-3 font-mono text-xs text-ink-soft">
                      {formatTaka(row.cost)}
                    </td>

                    {/* Net Profit */}
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-800 text-xs">
                      {formatTaka(row.profit)}
                    </td>

                    {/* Margin % */}
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                          row.profitMargin >= 40
                            ? "bg-emerald-100 text-emerald-800"
                            : row.profitMargin >= 25
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {row.profitMargin}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className="sm:hidden divide-y divide-line p-2">
          {loading ? (
            <div className="py-6 text-center text-xs text-ink-soft">হিসাব লোড হচ্ছে...</div>
          ) : dailyList.length === 0 ? (
            <div className="py-6 text-center text-xs text-ink-soft">কোনো তথ্য পাওয়া যায়নি</div>
          ) : (
            dailyList.map((row: any) => (
              <div key={row.date} className="p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-ink">{row.displayDate}</span>
                    {row.dayLabel && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                          row.dayLabel.includes("আজ")
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-bg text-ink-soft border border-line"
                        }`}
                      >
                        {row.dayLabel}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-bg border border-line">
                    {row.ordersCount} টি অর্ডার
                  </span>
                </div>

                {/* 2x2 Grid for Mobile */}
                <div className="grid grid-cols-2 gap-2 bg-bg p-2 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-ink-soft block">মূল পণ্য বিক্রয়:</span>
                    <span className="font-mono font-bold text-emerald-900">
                      {formatTaka(row.productSales)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-soft block">ডেলিভারি চার্জ:</span>
                    <span className="font-mono font-bold text-blue-700">
                      {formatTaka(row.deliveryFees)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-soft block">সর্বমোট আদায়:</span>
                    <span className="font-mono font-bold text-ink">
                      {formatTaka(row.totalRevenue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-soft block">নিট লাভ:</span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono font-bold text-emerald-800">
                        {formatTaka(row.profit)}
                      </span>
                      <span className="text-[9px] text-emerald-700">({row.profitMargin}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main 2-Column Content: Recent Orders & Restock Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders (2 Columns) */}
        <div className="lg:col-span-2 bg-paper rounded-2xl border border-line shadow-card overflow-hidden">
          <div className="p-3.5 border-b border-line flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold font-display text-ink">
                সাম্প্রতিক অর্ডারসমূহ (Recent Orders)
              </h3>
              <p className="text-[11px] text-ink-soft">গ্রাহকদের সর্বশেষ অর্ডারসমূহ</p>
            </div>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:text-forest-deep"
            >
              <span>সকল অর্ডার দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg/60 text-ink-soft text-[10px] uppercase tracking-wider border-b border-line">
                <tr>
                  <th className="py-2.5 px-3">Order #</th>
                  <th className="py-2.5 px-3">গ্রাহক</th>
                  <th className="py-2.5 px-3">স্ট্যাটাস</th>
                  <th className="py-2.5 px-3">পণ্য বিক্রয়</th>
                  <th className="py-2.5 px-3">ডেলিভারি</th>
                  <th className="py-2.5 px-3">সর্বমোট</th>
                  <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-ink-soft text-xs">
                      অর্ডার লোড হচ্ছে...
                    </td>
                  </tr>
                ) : data?.recentOrders?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-ink-soft text-xs">
                      এখনো কোনো অর্ডার পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  data?.recentOrders?.map((order: any) => (
                    <tr key={order.id} className="hover:bg-bg/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-xs text-ink">
                        {order.orderNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-ink text-xs">{order.customerName}</div>
                        <div className="text-[10px] text-ink-soft font-mono">{order.customerPhone}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={order.orderStatus} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-800 text-xs">
                        {formatTaka(order.subtotal || 0)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-blue-700 text-xs">
                        +{formatTaka(order.shippingFee || 0)}
                      </td>
                      <td className="py-2.5 px-3 font-bold font-mono text-ink text-xs">
                        {formatTaka(order.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="px-2 py-1 rounded-md bg-bg hover:bg-forest hover:text-white border border-line text-[10px] font-semibold text-forest transition-colors inline-block"
                        >
                          ম্যানেজ
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Watchlist (1 Column) */}
        <div className="bg-paper rounded-2xl border border-line shadow-card p-3.5 sm:p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div>
                <h3 className="text-sm sm:text-base font-bold font-display text-ink">রিস্টক অ্যালার্ট</h3>
                <p className="text-[11px] text-ink-soft">স্বল্প স্টকের প্রোডাক্টসমূহ</p>
              </div>
              <Link
                href="/admin/inventory"
                className="text-xs font-semibold text-forest hover:underline"
              >
                ইনভেন্টরি
              </Link>
            </div>

            <div className="space-y-2">
              {loading ? (
                <p className="text-xs text-ink-soft text-center py-3">ইনভেন্টরি যাচাই করা হচ্ছে...</p>
              ) : data?.lowStockProducts?.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-ink">স্টক সম্পূর্ণ ঠিক আছে</p>
                  <p className="text-[10px] text-ink-soft">পর্যাপ্ত পরিমাণ প্রোডাক্ট স্টকে রয়েছে</p>
                </div>
              ) : (
                data?.lowStockProducts?.slice(0, 5).map((prod: any) => (
                  <div
                    key={prod.id}
                    className="p-2 rounded-xl bg-bg border border-line flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-ink truncate">{prod.name}</div>
                      <div className="text-[10px] text-ink-soft">
                        {formatTaka(prod.price)} / {prod.unit}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold font-mono">
                        {prod.stockQuantity} left
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2.5 border-t border-line">
            <Link
              href="/admin/inventory"
              className="w-full py-2 rounded-lg bg-bg hover:bg-forest-soft text-forest text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>স্টক আপডেট করুন</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
