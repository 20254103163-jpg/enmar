"use client";
// app/admin/materials/page.tsx
// কাঁচামাল, ক্রয় খরচ ও প্রোডাক্ট ফর্মুলেশন ট্র্যাকিং (Raw Materials & Product Formulation)

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Boxes,
  Plus,
  Search,
  Calendar,
  Layers,
  TrendingUp,
  Receipt,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Package,
  ArrowRight,
  Filter,
  DollarSign,
  Scale,
  Sparkles,
  Link as LinkIcon,
  ShoppingBag,
} from "lucide-react";

interface RawMaterial {
  id: number;
  name: string;
  code?: string;
  category: string;
  unit: string;
  currentStock: number;
  unitCost: number;
  totalPurchased: number;
  totalSpent: number;
  supplier?: string;
  supplierPhone?: string;
  notes?: string;
  purchases?: any[];
  productIngredients?: Array<{
    id: number;
    productId: number;
    quantityNeeded: number;
    unit: string;
    product: {
      id: number;
      name: string;
      slug: string;
      price: number;
      discountPrice?: number;
      unit: string;
      images: any;
    };
  }>;
}

interface ProductFormulation {
  id: number;
  name: string;
  slug: string;
  category: string;
  sellingPrice: number;
  regularPrice: number;
  unit: string;
  images: any;
  ingredientsCount: number;
  ingredients: Array<{
    id: number;
    materialId: number;
    materialName: string;
    materialCode?: string;
    materialUnit: string;
    materialUnitCost: number;
    materialStock: number;
    quantityNeeded: number;
    unit: string;
    cost: number;
    notes?: string;
  }>;
  totalProductionCost: number;
  grossProfit: number;
  profitMarginPercent: number;
}

export default function AdminMaterialsPage() {
  const [activeTab, setActiveTab] = useState<"materials" | "formulations" | "purchases">("materials");
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [formulations, setFormulations] = useState<ProductFormulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [stats, setStats] = useState({
    totalMaterialsCount: 0,
    totalInvestment: 0,
    totalStockValuation: 0,
  });

  // Modals state
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedMaterialForPurchase, setSelectedMaterialForPurchase] = useState<RawMaterial | null>(null);

  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [selectedProductForFormula, setSelectedProductForFormula] = useState<ProductFormulation | null>(null);
  const [formulaRows, setFormulaRows] = useState<
    Array<{ materialId: number; quantityNeeded: number; unit: string; notes: string }>
  >([]);

  // Material Form
  const [materialForm, setMaterialForm] = useState({
    name: "",
    code: "",
    category: "উপাদান",
    unit: "kg",
    currentStock: 0,
    unitCost: 0,
    supplier: "",
    supplierPhone: "",
    notes: "",
  });

  // Purchase Form
  const [purchaseForm, setPurchaseForm] = useState({
    materialId: 0,
    purchaseDate: new Date().toISOString().split("T")[0],
    quantity: 1,
    unitPrice: 0,
    totalCost: 0,
    supplierName: "",
    invoiceNumber: "",
    batchNumber: "",
    notes: "",
  });

  // Alert State
  const [notification, setNotification] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
  }>({ show: false, type: "success", message: "" });

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: "success", message: "" });
    }, 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matRes, formRes] = await Promise.all([
        fetch("/api/admin/materials"),
        fetch("/api/admin/materials/formulations"),
      ]);

      const matJson = await matRes.json();
      const formJson = await formRes.json();

      if (matJson.success) {
        setMaterials(matJson.materials || []);
        if (matJson.stats) setStats(matJson.stats);
      }
      if (formJson.success) {
        setFormulations(formJson.products || []);
      }
    } catch (e: any) {
      showNotification("ডাটা লোড করতে সমস্যা হয়েছে: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format currency
  const fmt = (num: number) => `৳${Number(num || 0).toLocaleString("bn-BD")}`;
  const fmtEn = (num: number) => `৳${Number(num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Filter materials
  const filteredMaterials = materials.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.code && m.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.supplier && m.supplier.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCat = selectedCategory === "ALL" || m.category === selectedCategory;
    return matchSearch && matchCat;
  });

  // Extract all categories
  const categoriesList = Array.from(new Set(materials.map((m) => m.category || "অন্যান্য")));

  // Handle Save Material
  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialForm.name.trim()) {
      showNotification("কাঁচামাল বা উপাদানের নাম প্রদান করুন।", "error");
      return;
    }

    try {
      const url = editingMaterial
        ? `/api/admin/materials/${editingMaterial.id}`
        : `/api/admin/materials`;
      const method = editingMaterial ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(materialForm),
      });

      const json = await res.json();
      if (json.success) {
        showNotification(
          editingMaterial
            ? "কাঁচামাল সফলভাবে আপডেট হয়েছে।"
            : "নতুন কাঁচামাল সফলভাবে ডাটাবেজে যুক্ত হয়েছে।"
        );
        setIsAddMaterialOpen(false);
        setEditingMaterial(null);
        setMaterialForm({
          name: "",
          code: "",
          category: "উপাদান",
          unit: "kg",
          currentStock: 0,
          unitCost: 0,
          supplier: "",
          supplierPhone: "",
          notes: "",
        });
        fetchData();
      } else {
        showNotification(json.error || "সংরক্ষণ করা সম্ভব হয়নি।", "error");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  // Handle Delete Material
  const handleDeleteMaterial = async (id: number, name: string) => {
    if (!confirm(`আপনি কি নিশ্চিত যে "${name}" কাঁচামালটি ডিলিট করতে চান?`)) return;

    try {
      const res = await fetch(`/api/admin/materials/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showNotification("কাঁচামাল মুছে ফেলা হয়েছে।");
        fetchData();
      } else {
        showNotification(json.error || "মুছে ফেলা সম্ভব হয়নি।", "error");
      }
    } catch (e: any) {
      showNotification(e.message, "error");
    }
  };

  // Open Purchase Modal
  const openPurchaseModal = (m?: RawMaterial) => {
    const target = m || materials[0];
    if (!target) {
      showNotification("প্রথমে অন্তত একটি কাঁচামাল যোগ করুন।", "error");
      return;
    }
    setSelectedMaterialForPurchase(target);
    setPurchaseForm({
      materialId: target.id,
      purchaseDate: new Date().toISOString().split("T")[0],
      quantity: 10,
      unitPrice: Number(target.unitCost || 0),
      totalCost: 10 * Number(target.unitCost || 0),
      supplierName: target.supplier || "",
      invoiceNumber: "",
      batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
      notes: "",
    });
    setIsPurchaseModalOpen(true);
  };

  // Handle Save Purchase
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.materialId || purchaseForm.quantity <= 0) {
      showNotification("সঠিক কাঁচামাল ও পরিমাণ দিন।", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/materials/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(purchaseForm),
      });

      const json = await res.json();
      if (json.success) {
        showNotification("ক্রয় ভাউচার সফলভাবে সেভ হয়েছে এবং স্টক আপডেট হয়েছে!");
        setIsPurchaseModalOpen(false);
        fetchData();
      } else {
        showNotification(json.error || "ক্রয় সেভ করা যায়নি।", "error");
      }
    } catch (e: any) {
      showNotification(e.message, "error");
    }
  };

  // Open Formula / BOM Modal for Product
  const openFormulaModal = (prod: ProductFormulation) => {
    setSelectedProductForFormula(prod);
    if (prod.ingredients && prod.ingredients.length > 0) {
      setFormulaRows(
        prod.ingredients.map((ing) => ({
          materialId: ing.materialId,
          quantityNeeded: ing.quantityNeeded,
          unit: ing.unit,
          notes: ing.notes || "",
        }))
      );
    } else {
      setFormulaRows([
        {
          materialId: materials[0]?.id || 0,
          quantityNeeded: 1,
          unit: materials[0]?.unit || "kg",
          notes: "",
        },
      ]);
    }
    setIsFormulaModalOpen(true);
  };

  // Handle Save Formula
  const handleSaveFormula = async () => {
    if (!selectedProductForFormula) return;

    const validRows = formulaRows.filter(
      (r) => r.materialId > 0 && Number(r.quantityNeeded) > 0
    );

    try {
      const res = await fetch("/api/admin/materials/formulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductForFormula.id,
          ingredients: validRows,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showNotification(json.message);
        setIsFormulaModalOpen(false);
        fetchData();
      } else {
        showNotification(json.error || "ফর্মুলেশন সংরক্ষণ করা সম্ভব হয়নি।", "error");
      }
    } catch (e: any) {
      showNotification(e.message, "error");
    }
  };

  // Calculate live formula cost preview in modal
  const liveFormulaTotalCost = formulaRows.reduce((acc, row) => {
    const mat = materials.find((m) => m.id === Number(row.materialId));
    const cost = mat ? Number(mat.unitCost || 0) * Number(row.quantityNeeded || 0) : 0;
    return acc + cost;
  }, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {notification.show && (
        <div
          className={`fixed top-5 right-5 z-[9999] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-semibold transition-all animate-in slide-in-from-top-4 ${
            notification.type === "success"
              ? "bg-emerald-950 text-emerald-200 border-emerald-800"
              : "bg-rose-950 text-rose-200 border-rose-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
              কাঁচামাল ও উৎপাদন হিসাব
            </span>
            <span className="text-xs text-stone-500 font-medium">BOM & Costing Engine</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-stone-900 flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-forest" />
            <span>কাঁচামাল ও প্রোডাক্ট ফর্মুলেশন ব্যবস্থাপনা</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 max-w-2xl">
            প্রোডাক্ট কি কি দিয়ে বানানো হচ্ছে, কবে কত টাকা দিয়ে কেনা হচ্ছে এবং কোন উপাদানে কত খরচ হচ্ছে—সবকিছু স্বয়ংক্রিয়ভাবে হিসাব ও ট্র্যাক করুন।
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setEditingMaterial(null);
              setMaterialForm({
                name: "",
                code: `RM-${Date.now().toString().slice(-4)}`,
                category: "উপাদান",
                unit: "kg",
                currentStock: 0,
                unitCost: 0,
                supplier: "",
                supplierPhone: "",
                notes: "",
              });
              setIsAddMaterialOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-forest hover:bg-forest-deep text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন কাঁচামাল</span>
          </button>

          <button
            onClick={() => openPurchaseModal()}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>ক্রয় ভাউচার এন্ট্রি</span>
          </button>

          <button
            onClick={fetchData}
            title="রিফ্রেশ"
            className="p-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-forest/10 text-forest flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 block">মোট কাঁচামাল তালিকা</span>
            <span className="text-xl font-bold font-mono text-stone-900">
              {stats.totalMaterialsCount} টি আইটেম
            </span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 block">মোট ক্রয় খরচ (বিনিয়োগ)</span>
            <span className="text-xl font-bold font-mono text-stone-900">
              {fmt(stats.totalInvestment)}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 block">বর্তমান স্টক ভ্যালুয়েশন</span>
            <span className="text-xl font-bold font-mono text-stone-900">
              {fmt(stats.totalStockValuation)}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-700 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 block">রেসিপি ফর্মুলেটেড প্রোডাক্ট</span>
            <span className="text-xl font-bold font-mono text-stone-900">
              {formulations.filter((f) => f.ingredientsCount > 0).length} / {formulations.length} টি
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-stone-200 gap-2">
        <button
          onClick={() => setActiveTab("materials")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "materials"
              ? "border-forest text-forest"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>১. কাঁচামাল ও উপাদান তালিকা ({materials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("formulations")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "formulations"
              ? "border-forest text-forest"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>২. প্রোডাক্ট রেসিপি ও উৎপাদন খরচ ({formulations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("purchases")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "purchases"
              ? "border-forest text-forest"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>৩. ক্রয় ভাউচার লগ ও ইতিহাস</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: RAW MATERIALS LIST                                                 */}
      {/* ========================================================================= */}
      {activeTab === "materials" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="কাঁচামালের নাম, কোড বা সরবরাহকারী খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-forest"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-700 focus:outline-none focus:border-forest cursor-pointer"
              >
                <option value="ALL">সকল ক্যাটাগরি</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Materials Table */}
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                    <th className="py-3.5 px-4">কাঁচামাল ও কোড</th>
                    <th className="py-3.5 px-3">ক্যাটাগরি</th>
                    <th className="py-3.5 px-3">বর্তমান স্টক</th>
                    <th className="py-3.5 px-3">ক্রয়মূল্য (প্রতি ইউনিট)</th>
                    <th className="py-3.5 px-3">মোট ক্রয়কৃত</th>
                    <th className="py-3.5 px-3">মোট খরচ</th>
                    <th className="py-3.5 px-3">যেসব প্রোডাক্টে ব্যবহার হয়</th>
                    <th className="py-3.5 px-3">সরবরাহকারী</th>
                    <th className="py-3.5 px-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-stone-400">
                        {loading ? "কাঁচামালের ডাটা লোড হচ্ছে..." : "কোনো কাঁচামাল পাওয়া যায়নি। নতুন কাঁচামাল যুক্ত করুন।"}
                      </td>
                    </tr>
                  ) : (
                    filteredMaterials.map((mat) => {
                      const linkedProducts = mat.productIngredients || [];
                      return (
                        <tr key={mat.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-stone-900 text-sm">{mat.name}</div>
                            {mat.code && (
                              <span className="font-mono text-[10px] text-stone-500 block">
                                {mat.code}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                              {mat.category || "উপাদান"}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-stone-900 font-mono">
                              {Number(mat.currentStock).toLocaleString("bn-BD")}
                            </span>{" "}
                            <span className="text-[11px] text-stone-500">{mat.unit}</span>
                          </td>
                          <td className="py-3.5 px-3 font-mono font-bold text-stone-800">
                            {fmt(mat.unitCost)}
                            <span className="text-[10px] text-stone-500 font-normal"> /{mat.unit}</span>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-stone-600">
                            {Number(mat.totalPurchased).toLocaleString("bn-BD")} {mat.unit}
                          </td>
                          <td className="py-3.5 px-3 font-mono font-bold text-emerald-800">
                            {fmt(mat.totalSpent)}
                          </td>
                          <td className="py-3.5 px-3">
                            {linkedProducts.length === 0 ? (
                              <span className="text-[11px] text-stone-400 italic">কোনো প্রোডাক্টে যুক্ত নেই</span>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {linkedProducts.map((lp) => (
                                  <span
                                    key={lp.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    title={`প্রতি ইউনিটে লাগে: ${lp.quantityNeeded} ${lp.unit}`}
                                  >
                                    <Package className="w-2.5 h-2.5" />
                                    <span>{lp.product.name}</span>
                                    <span className="font-mono font-bold">({lp.quantityNeeded}{lp.unit})</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="text-stone-800 font-medium">{mat.supplier || "—"}</div>
                            {mat.supplierPhone && (
                              <div className="text-[10px] text-stone-500 font-mono">{mat.supplierPhone}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openPurchaseModal(mat)}
                                title="নতুন ক্রয় এন্ট্রি"
                                className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200 flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>ক্রয়</span>
                              </button>

                              <button
                                onClick={() => {
                                  setEditingMaterial(mat);
                                  setMaterialForm({
                                    name: mat.name,
                                    code: mat.code || "",
                                    category: mat.category || "উপাদান",
                                    unit: mat.unit || "kg",
                                    currentStock: Number(mat.currentStock || 0),
                                    unitCost: Number(mat.unitCost || 0),
                                    supplier: mat.supplier || "",
                                    supplierPhone: mat.supplierPhone || "",
                                    notes: mat.notes || "",
                                  });
                                  setIsAddMaterialOpen(true);
                                }}
                                title="এডিট"
                                className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteMaterial(mat.id, mat.name)}
                                title="ডিলিট"
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PRODUCT FORMULATIONS & PRODUCTION COSTING (BOM)                     */}
      {/* ========================================================================= */}
      {activeTab === "formulations" && (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl flex items-start gap-3 text-xs text-emerald-950">
            <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-sm">প্রোডাক্ট ফর্মুলেশন ও লাভ-ক্ষতির হিসাব:</span>
              <span>
                এখানে প্রতিটি প্রোডাক্ট তৈরি করতে কি কি কাঁচামাল এবং কতটুকু লাগে তা সেট করুন। কাঁচামালের ক্রয়মূল্যের ওপর ভিত্তি করে প্রতি ইউনিটের মোট উৎপাদন খরচ (Cost of Goods Sold) এবং গ্রস প্রফিট মার্জিন স্বয়ংক্রিয়ভাবে হিসাব হবে।
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {formulations.map((prod) => {
              const hasIngredients = prod.ingredients && prod.ingredients.length > 0;
              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-3xl border border-stone-200/80 shadow-xs p-5 flex flex-col justify-between hover:border-forest/40 transition-all space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                          {prod.category}
                        </span>
                        <h3 className="text-base font-bold text-stone-900 leading-tight">
                          {prod.name}
                        </h3>
                        <span className="text-xs text-stone-500 font-mono">
                          বিক্রয়মূল্য: <strong className="text-stone-900">{fmt(prod.sellingPrice)}</strong> /{prod.unit}
                        </span>
                      </div>

                      <button
                        onClick={() => openFormulaModal(prod)}
                        className="px-3 py-1.5 rounded-xl bg-forest/10 hover:bg-forest text-forest hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{hasIngredients ? "রেসিপি পরিবর্তন" : "+ উপাদান যোগ"}</span>
                      </button>
                    </div>

                    {/* Ingredients Breakdown Box */}
                    <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 border-b border-stone-200 pb-1.5">
                        <span>ব্যবহৃত কাঁচামাল ({prod.ingredientsCount}টি)</span>
                        <span>খরচ / ইউনিট</span>
                      </div>

                      {!hasIngredients ? (
                        <div className="text-center py-4 text-stone-400 text-xs italic">
                          কোনো উপাদান যোগ করা হয়নি।
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {prod.ingredients.map((ing) => (
                            <div
                              key={ing.id}
                              className="flex items-center justify-between text-xs text-stone-700"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="w-1.5 h-1.5 rounded-full bg-forest shrink-0" />
                                <span className="truncate">{ing.materialName}</span>
                                <span className="text-[10px] text-stone-500 font-mono">
                                  ({ing.quantityNeeded} {ing.unit})
                                </span>
                              </div>
                              <span className="font-mono font-semibold text-stone-900 shrink-0">
                                {fmt(ing.cost)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Summary Box */}
                  <div className="border-t border-stone-100 pt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>মোট উৎপাদন খরচ (COGS):</span>
                      <span className="font-mono font-bold text-stone-900">
                        {fmt(prod.totalProductionCost)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-stone-800">
                      <span className="font-semibold">আনুমানিক লাভ (Margin):</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-emerald-700">
                          +{fmt(prod.grossProfit)}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            prod.profitMarginPercent >= 30
                              ? "bg-emerald-100 text-emerald-800"
                              : prod.profitMarginPercent > 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {prod.profitMarginPercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PURCHASES VOUCHERS LOG                                             */}
      {/* ========================================================================= */}
      {activeTab === "purchases" && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-600" />
                <span>কাঁচামাল ক্রয়ের সাম্প্রতিক ভাউচার ও ইনভয়েস হিস্ট্রি</span>
              </h3>
              <button
                onClick={() => openPurchaseModal()}
                className="px-3 py-1.5 rounded-xl bg-forest text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন ক্রয় রেকর্ড</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                    <th className="py-3 px-4">তারিখ</th>
                    <th className="py-3 px-3">কাঁচামালের নাম</th>
                    <th className="py-3 px-3">পরিমাণ</th>
                    <th className="py-3 px-3">দর (প্রতি ইউনিট)</th>
                    <th className="py-3 px-3">মোট খরচ</th>
                    <th className="py-3 px-3">সরবরাহকারী</th>
                    <th className="py-3 px-3">চালান / মেমো নং</th>
                    <th className="py-3 px-3">লট / ব্যাচ</th>
                    <th className="py-3 px-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {materials.flatMap((m) =>
                    (m.purchases || []).map((p) => ({
                      ...p,
                      materialName: m.name,
                      materialUnit: m.unit,
                    }))
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-stone-400">
                        এখনো কোনো ক্রয়ের ভাউচার যোগ করা হয়নি।
                      </td>
                    </tr>
                  ) : (
                    materials
                      .flatMap((m) =>
                        (m.purchases || []).map((p) => ({
                          ...p,
                          materialName: m.name,
                          materialUnit: m.unit,
                        }))
                      )
                      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-stone-50/70">
                          <td className="py-3 px-4 font-mono text-stone-600">
                            {new Date(p.purchaseDate).toLocaleDateString("bn-BD")}
                          </td>
                          <td className="py-3 px-3 font-bold text-stone-900">{p.materialName}</td>
                          <td className="py-3 px-3 font-mono font-bold text-stone-800">
                            {Number(p.quantity).toLocaleString("bn-BD")} {p.materialUnit}
                          </td>
                          <td className="py-3 px-3 font-mono text-stone-600">{fmt(p.unitPrice)}</td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-800">
                            {fmt(p.totalCost)}
                          </td>
                          <td className="py-3 px-3 text-stone-700">{p.supplierName || "—"}</td>
                          <td className="py-3 px-3 font-mono text-stone-500">
                            {p.invoiceNumber || "—"}
                          </td>
                          <td className="py-3 px-3 font-mono text-stone-500">{p.batchNumber || "—"}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={async () => {
                                if (confirm("এই ক্রয় রেকর্ডটি ডিলিট করতে চান? এতে স্টকও কমে যাবে।")) {
                                  const res = await fetch(
                                    `/api/admin/materials/purchases?id=${p.id}`,
                                    { method: "DELETE" }
                                  );
                                  const json = await res.json();
                                  if (json.success) {
                                    showNotification(json.message);
                                    fetchData();
                                  } else {
                                    showNotification(json.error, "error");
                                  }
                                }
                              }}
                              className="p-1 rounded-md text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="ডিলিট"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT RAW MATERIAL                                          */}
      {/* ========================================================================= */}
      {isAddMaterialOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-forest" />
                <span>{editingMaterial ? "কাঁচামাল তথ্য এডিট করুন" : "নতুন কাঁচামাল / উপকরণ যুক্ত করুন"}</span>
              </h2>
              <button
                onClick={() => setIsAddMaterialOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-stone-700">উপাদান বা কাঁচামালের নাম *</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: খাঁটি সরিষা দানা / ৫০০ মিলি কাঁচের বোতল"
                  value={materialForm.name}
                  onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-forest text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">কোড / SKU (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    placeholder="RM-MUSTARD-01"
                    value={materialForm.code}
                    onChange={(e) => setMaterialForm({ ...materialForm, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">ক্যাটাগরি</label>
                  <select
                    value={materialForm.category}
                    onChange={(e) => setMaterialForm({ ...materialForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
                  >
                    <option value="উপাদান">খাদ্য উপাদান / শস্য</option>
                    <option value="তেল ও মশলা">তেল ও মশলা</option>
                    <option value="প্যাকেজিং ও বোতল">প্যাকেজিং, বোতল ও জার</option>
                    <option value="লেবেল ও সিল">লেবেল, ক্যাপ ও সিল</option>
                    <option value="ড্রাই ফ্রুটস ও বাদাম">ড্রাই ফ্রুটস ও বাদাম</option>
                    <option value="অন্যান্য">অন্যান্য কাঁচামাল</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">পরিমাপের একক</label>
                  <select
                    value={materialForm.unit}
                    onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 font-semibold text-xs"
                  >
                    <option value="kg">kg (কেজি)</option>
                    <option value="gm">gm (গ্রাম)</option>
                    <option value="liter">liter (লিটার)</option>
                    <option value="ml">ml (মিলি)</option>
                    <option value="piece">piece (টি / পিস)</option>
                    <option value="drum">drum (ড্রাম)</option>
                    <option value="packet">packet (প্যাকেট)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">বর্তমান স্টক</label>
                  <input
                    type="number"
                    step="any"
                    value={materialForm.currentStock}
                    onChange={(e) =>
                      setMaterialForm({ ...materialForm, currentStock: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">একক ক্রয়মূল্য (৳)</label>
                  <input
                    type="number"
                    step="any"
                    value={materialForm.unitCost}
                    onChange={(e) =>
                      setMaterialForm({ ...materialForm, unitCost: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs font-bold text-forest"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">সরবরাহকারী / কৃষক / বাজার</label>
                  <input
                    type="text"
                    placeholder="যেমন: কৃষক আবুল কালাম / নাটোর মিল"
                    value={materialForm.supplier}
                    onChange={(e) => setMaterialForm({ ...materialForm, supplier: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">যোগাযোগের মোবাইল নং</label>
                  <input
                    type="text"
                    placeholder="017XXXXXXXX"
                    value={materialForm.supplierPhone}
                    onChange={(e) => setMaterialForm({ ...materialForm, supplierPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">মন্তব্য বা নোটস</label>
                <textarea
                  rows={2}
                  placeholder="কাঁচামালের মান, গ্রেড বা সোর্স সংক্রান্ত তথ্য..."
                  value={materialForm.notes}
                  onChange={(e) => setMaterialForm({ ...materialForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddMaterialOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-forest hover:bg-forest-deep text-white font-bold transition-colors cursor-pointer"
                >
                  {editingMaterial ? "আপডেট করুন" : "সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: LOG NEW PURCHASE VOUCHER                                         */}
      {/* ========================================================================= */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                <span>কাঁচামাল ক্রয়ের নতুন ভাউচার এন্ট্রি</span>
              </h2>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-stone-700">কোন কাঁচামাল কেনা হয়েছে? *</label>
                <select
                  required
                  value={purchaseForm.materialId}
                  onChange={(e) => {
                    const id = parseInt(e.target.value, 10);
                    const mat = materials.find((m) => m.id === id);
                    setPurchaseForm({
                      ...purchaseForm,
                      materialId: id,
                      unitPrice: mat ? Number(mat.unitCost || 0) : 0,
                      totalCost: purchaseForm.quantity * (mat ? Number(mat.unitCost || 0) : 0),
                      supplierName: mat?.supplier || purchaseForm.supplierName,
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 font-bold text-sm text-stone-900 cursor-pointer"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.category} — {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">ক্রয়ের তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={purchaseForm.purchaseDate}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">ক্রয়ের পরিমাণ *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={purchaseForm.quantity}
                    onChange={(e) => {
                      const qty = parseFloat(e.target.value) || 0;
                      setPurchaseForm({
                        ...purchaseForm,
                        quantity: qty,
                        totalCost: qty * purchaseForm.unitPrice,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs font-bold text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">দর / প্রতি একক মূল্য (৳)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={purchaseForm.unitPrice}
                    onChange={(e) => {
                      const price = parseFloat(e.target.value) || 0;
                      setPurchaseForm({
                        ...purchaseForm,
                        unitPrice: price,
                        totalCost: purchaseForm.quantity * price,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">মোট ক্রয়মূল্য / বিল (৳) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={purchaseForm.totalCost}
                    onChange={(e) => {
                      const tot = parseFloat(e.target.value) || 0;
                      const unitP = purchaseForm.quantity > 0 ? tot / purchaseForm.quantity : 0;
                      setPurchaseForm({
                        ...purchaseForm,
                        totalCost: tot,
                        unitPrice: Math.round(unitP * 100) / 100,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-amber-50/50 font-mono text-xs font-bold text-amber-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">সরবরাহকারীর নাম</label>
                  <input
                    type="text"
                    placeholder="ব্যক্তি / পাইকারি দোকান / মিল"
                    value={purchaseForm.supplierName}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">ভাউচার / চালান / বিল নং</label>
                  <input
                    type="text"
                    placeholder="INV-2026-001"
                    value={purchaseForm.invoiceNumber}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">লট / ব্যাচ নম্বর</label>
                <input
                  type="text"
                  placeholder="BATCH-01"
                  value={purchaseForm.batchNumber}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, batchNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors cursor-pointer"
                >
                  ক্রয় ভাউচার সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PRODUCT RECIPE FORMULATION (BOM) BUILDER                         */}
      {/* ========================================================================= */}
      {isFormulaModalOpen && selectedProductForFormula && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-stone-200">
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest block">
                  Product Bill of Materials (BOM)
                </span>
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-forest" />
                  <span>{selectedProductForFormula.name} — উপাদান ও খরচ ফর্মুলেশন</span>
                </h2>
                <span className="text-xs text-stone-500 font-mono block mt-0.5">
                  বিক্রয়মূল্য: <strong>{fmt(selectedProductForFormula.sellingPrice)}</strong> (প্রতি {selectedProductForFormula.unit})
                </span>
              </div>
              <button
                onClick={() => setIsFormulaModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-700">
                  এই প্রোডাক্টটি তৈরিতে কি কি উপাদান কতটুকু লাগে:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFormulaRows([
                      ...formulaRows,
                      {
                        materialId: materials[0]?.id || 0,
                        quantityNeeded: 1,
                        unit: materials[0]?.unit || "kg",
                        notes: "",
                      },
                    ])
                  }
                  className="px-2.5 py-1 rounded-lg bg-forest/10 hover:bg-forest text-forest hover:text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>উপাদান যোগ করুন</span>
                </button>
              </div>

              {/* Rows */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {formulaRows.map((row, idx) => {
                  const selectedMat = materials.find((m) => m.id === Number(row.materialId));
                  const rowCost = selectedMat
                    ? Number(selectedMat.unitCost || 0) * Number(row.quantityNeeded || 0)
                    : 0;

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-center gap-2 text-xs"
                    >
                      <div className="w-full sm:flex-1">
                        <label className="text-[10px] font-semibold text-stone-500 block mb-0.5">
                          কাঁচামাল নির্বাচন
                        </label>
                        <select
                          value={row.materialId}
                          onChange={(e) => {
                            const newMatId = parseInt(e.target.value, 10);
                            const foundMat = materials.find((m) => m.id === newMatId);
                            const updated = [...formulaRows];
                            updated[idx].materialId = newMatId;
                            if (foundMat) updated[idx].unit = foundMat.unit;
                            setFormulaRows(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white font-medium text-stone-800"
                        >
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({fmt(m.unitCost)}/{m.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full sm:w-24">
                        <label className="text-[10px] font-semibold text-stone-500 block mb-0.5">
                          পরিমাণ
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={row.quantityNeeded}
                          onChange={(e) => {
                            const updated = [...formulaRows];
                            updated[idx].quantityNeeded = parseFloat(e.target.value) || 0;
                            setFormulaRows(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white font-mono font-bold text-center"
                        />
                      </div>

                      <div className="w-full sm:w-20">
                        <label className="text-[10px] font-semibold text-stone-500 block mb-0.5">
                          একক
                        </label>
                        <input
                          type="text"
                          value={row.unit}
                          onChange={(e) => {
                            const updated = [...formulaRows];
                            updated[idx].unit = e.target.value;
                            setFormulaRows(updated);
                          }}
                          className="w-full px-2 py-1.5 rounded-xl border border-stone-200 bg-white text-center text-stone-600"
                        />
                      </div>

                      <div className="w-full sm:w-28 text-right font-mono shrink-0">
                        <span className="text-[10px] text-stone-400 block">খরচ:</span>
                        <span className="font-bold text-stone-900">{fmt(rowCost)}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = formulaRows.filter((_, i) => i !== idx);
                          setFormulaRows(updated);
                        }}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 cursor-pointer shrink-0 mt-3 sm:mt-0"
                        title="সরান"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Total Calculation Card */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs">
                <div className="flex justify-between text-emerald-900">
                  <span className="font-semibold">মোট উপাদান উৎপাদন খরচ (COGS):</span>
                  <span className="font-mono font-bold text-sm text-stone-900">
                    {fmt(liveFormulaTotalCost)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-emerald-950 pt-1 border-t border-emerald-200/60">
                  <span className="font-semibold">প্রত্যাশিত মুনাফা (Gross Margin):</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-700">
                      +{fmt(Math.max(0, selectedProductForFormula.sellingPrice - liveFormulaTotalCost))}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-200 text-emerald-900">
                      {selectedProductForFormula.sellingPrice > 0
                        ? Math.round(
                            ((selectedProductForFormula.sellingPrice - liveFormulaTotalCost) /
                              selectedProductForFormula.sellingPrice) *
                              1000
                          ) / 10
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 text-xs">
              <button
                type="button"
                onClick={() => setIsFormulaModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveFormula}
                className="px-5 py-2 rounded-xl bg-forest hover:bg-forest-deep text-white font-bold transition-colors cursor-pointer"
              >
                রেসিপি ফর্মুলেশন সেভ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
