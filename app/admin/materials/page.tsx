"use client";
// app/admin/materials/page.tsx
// কাঁচামাল, ক্রয় খরচ, প্রোডাক্ট ফর্মুলেশন ও উৎপাদন রেকর্ড ট্র্যাকিং (Raw Materials, BOM & Production Batches)

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
  Factory,
  Eye,
  Printer,
  ClipboardList,
  Check,
  History,
  Clock,
  UserCheck,
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
  stockQuantity?: number;
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

interface ProductionBatchItem {
  id: number;
  materialId: number;
  materialName: string;
  materialCode?: string;
  materialCategory?: string;
  quantityUsed: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  currentMaterialStock?: number;
}

interface ProductionBatch {
  id: number;
  batchNumber: string;
  productId: number;
  productName: string;
  productSlug: string;
  productCategory: string;
  productImages: any;
  productSellingPrice: number;
  productStock: number;
  quantityProduced: number;
  unit: string;
  productionDate: string;
  unitCost: number;
  totalCost: number;
  operatorName?: string;
  notes?: string;
  deductedStock: boolean;
  addedToStock: boolean;
  createdAt: string;
  itemsCount: number;
  items: ProductionBatchItem[];
}

export default function AdminMaterialsPage() {
  const [activeTab, setActiveTab] = useState<"materials" | "formulations" | "batches" | "purchases">("materials");
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [formulations, setFormulations] = useState<ProductFormulation[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedBatchProductFilter, setSelectedBatchProductFilter] = useState("ALL");

  const [stats, setStats] = useState({
    totalMaterialsCount: 0,
    totalInvestment: 0,
    totalStockValuation: 0,
  });

  const [batchStats, setBatchStats] = useState({
    totalBatchesCount: 0,
    totalUnitsProduced: 0,
    totalProductionCost: 0,
    thisMonthBatchesCount: 0,
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

  // Production Batch Modals
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBatchDetailModalOpen, setIsBatchDetailModalOpen] = useState(false);
  const [selectedBatchForDetail, setSelectedBatchForDetail] = useState<ProductionBatch | null>(null);

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

  // Production Batch Form
  const [batchForm, setBatchForm] = useState<{
    productId: number;
    batchNumber: string;
    quantityProduced: number;
    unit: string;
    productionDate: string;
    operatorName: string;
    notes: string;
    deductedStock: boolean;
    addedToStock: boolean;
    items: Array<{
      materialId: number;
      quantityUsed: number;
      unit: string;
      unitCost: number;
    }>;
  }>({
    productId: 0,
    batchNumber: "",
    quantityProduced: 1,
    unit: "piece",
    productionDate: new Date().toISOString().split("T")[0],
    operatorName: "",
    notes: "",
    deductedStock: true,
    addedToStock: true,
    items: [],
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
    }, 4500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matRes, formRes, batchRes] = await Promise.all([
        fetch("/api/admin/materials"),
        fetch("/api/admin/materials/formulations"),
        fetch("/api/admin/materials/batches"),
      ]);

      const matJson = await matRes.json();
      const formJson = await formRes.json();
      const batchJson = await batchRes.json();

      if (matJson.success) {
        setMaterials(matJson.materials || []);
        if (matJson.stats) setStats(matJson.stats);
      }
      if (formJson.success) {
        setFormulations(formJson.products || []);
      }
      if (batchJson.success) {
        setBatches(batchJson.data || []);
        if (batchJson.stats) setBatchStats(batchJson.stats);
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

  // Filter batches
  const filteredBatches = batches.filter((b) => {
    const matchSearch =
      b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.operatorName && b.operatorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.notes && b.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchProd =
      selectedBatchProductFilter === "ALL" || b.productId.toString() === selectedBatchProductFilter;
    return matchSearch && matchProd;
  });

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

  // Open Purchase Modal
  const openPurchaseModal = (mat?: RawMaterial) => {
    const targetMat = mat || (materials.length > 0 ? materials[0] : null);
    setSelectedMaterialForPurchase(targetMat);
    setPurchaseForm({
      materialId: targetMat ? targetMat.id : 0,
      purchaseDate: new Date().toISOString().split("T")[0],
      quantity: 1,
      unitPrice: targetMat ? Number(targetMat.unitCost || 0) : 0,
      totalCost: targetMat ? Number(targetMat.unitCost || 0) : 0,
      supplierName: targetMat?.supplier || "",
      invoiceNumber: "",
      batchNumber: "",
      notes: "",
    });
    setIsPurchaseModalOpen(true);
  };

  // Handle Save Purchase
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.materialId || purchaseForm.quantity <= 0) {
      showNotification("সঠিক কাঁচামাল ও পরিমাণ নির্বাচন করুন।", "error");
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
        showNotification(json.message || "ক্রয় ভাউচার সফলভাবে সেভ হয়েছে!");
        setIsPurchaseModalOpen(false);
        fetchData();
      } else {
        showNotification(json.error || "ক্রয় হিসাব সংরক্ষণ করা যায়নি।", "error");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  // Open Formula Builder
  const openFormulaModal = (product: ProductFormulation) => {
    setSelectedProductForFormula(product);
    if (product.ingredients && product.ingredients.length > 0) {
      setFormulaRows(
        product.ingredients.map((ing) => ({
          materialId: ing.materialId,
          quantityNeeded: ing.quantityNeeded,
          unit: ing.unit || "kg",
          notes: ing.notes || "",
        }))
      );
    } else {
      setFormulaRows([
        {
          materialId: materials.length > 0 ? materials[0].id : 0,
          quantityNeeded: 1,
          unit: materials.length > 0 ? materials[0].unit : "kg",
          notes: "",
        },
      ]);
    }
    setIsFormulaModalOpen(true);
  };

  // Handle Save Formula
  const handleSaveFormula = async () => {
    if (!selectedProductForFormula) return;

    const validRows = formulaRows.filter((r) => r.materialId > 0 && r.quantityNeeded > 0);
    if (validRows.length === 0) {
      showNotification("অন্তত একটি উপাদান ও তার পরিমাণ যোগ করুন।", "error");
      return;
    }

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
        showNotification(json.message || "প্রোডাক্ট রেসিপি সফলভাবে সেভ হয়েছে!");
        setIsFormulaModalOpen(false);
        fetchData();
      } else {
        showNotification(json.error || "রেসিপি সেভ করা যায়নি।", "error");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  // ==========================================
  // PRODUCTION BATCH (কবে কী বানালাম) HANDLERS
  // ==========================================

  const openNewBatchModal = (preselectedProductId?: number) => {
    const prodId =
      preselectedProductId ||
      (formulations.length > 0 ? formulations[0].id : 0);
    const prod = formulations.find((f) => f.id === prodId) || (formulations.length > 0 ? formulations[0] : null);

    const todayStr = new Date().toISOString().slice(0, 10);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const generatedBatchNo = `PRD-${todayStr.replace(/-/g, "")}-${randomSuffix}`;

    const defaultQty = 1;
    const defaultUnit = prod?.unit || "piece";

    // Auto-populate recipe ingredients if available
    let initialItems: Array<{ materialId: number; quantityUsed: number; unit: string; unitCost: number }> = [];

    if (prod && prod.ingredients && prod.ingredients.length > 0) {
      initialItems = prod.ingredients.map((ing) => ({
        materialId: ing.materialId,
        quantityUsed: Math.round(ing.quantityNeeded * defaultQty * 1000) / 1000,
        unit: ing.unit || ing.materialUnit || "kg",
        unitCost: ing.materialUnitCost || 0,
      }));
    } else if (materials.length > 0) {
      initialItems = [
        {
          materialId: materials[0].id,
          quantityUsed: 1,
          unit: materials[0].unit,
          unitCost: Number(materials[0].unitCost || 0),
        },
      ];
    }

    setBatchForm({
      productId: prod ? prod.id : 0,
      batchNumber: generatedBatchNo,
      quantityProduced: defaultQty,
      unit: defaultUnit,
      productionDate: todayStr,
      operatorName: "",
      notes: "",
      deductedStock: true,
      addedToStock: true,
      items: initialItems,
    });

    setIsBatchModalOpen(true);
  };

  const handleProductSelectForBatch = (productId: number, qtyProduced?: number) => {
    const prod = formulations.find((f) => f.id === productId);
    if (!prod) return;

    const currentQty = qtyProduced !== undefined ? qtyProduced : batchForm.quantityProduced || 1;

    let items: Array<{ materialId: number; quantityUsed: number; unit: string; unitCost: number }> = [];

    if (prod.ingredients && prod.ingredients.length > 0) {
      items = prod.ingredients.map((ing) => ({
        materialId: ing.materialId,
        quantityUsed: Math.round(ing.quantityNeeded * currentQty * 1000) / 1000,
        unit: ing.unit || ing.materialUnit || "kg",
        unitCost: ing.materialUnitCost || 0,
      }));
    } else {
      items = batchForm.items.length > 0 ? batchForm.items : [
        {
          materialId: materials.length > 0 ? materials[0].id : 0,
          quantityUsed: 1,
          unit: materials.length > 0 ? materials[0].unit : "kg",
          unitCost: materials.length > 0 ? Number(materials[0].unitCost || 0) : 0,
        },
      ];
    }

    setBatchForm((prev) => ({
      ...prev,
      productId,
      unit: prod.unit || "piece",
      items,
    }));
  };

  const recalculateBatchItemsFromRecipe = () => {
    const prod = formulations.find((f) => f.id === batchForm.productId);
    if (!prod || !prod.ingredients || prod.ingredients.length === 0) {
      showNotification("এই প্রোডাক্টের কোনো সংরক্ষিত রেসিপি নেই। নিজে উপাদান যোগ করুন।", "error");
      return;
    }

    const qty = batchForm.quantityProduced || 1;
    const recalculated = prod.ingredients.map((ing) => ({
      materialId: ing.materialId,
      quantityUsed: Math.round(ing.quantityNeeded * qty * 1000) / 1000,
      unit: ing.unit || ing.materialUnit || "kg",
      unitCost: ing.materialUnitCost || 0,
    }));

    setBatchForm((prev) => ({
      ...prev,
      items: recalculated,
    }));
    showNotification("রেসিপি অনুযায়ী কাঁচামালের পরিমাণ হিসাব করা হয়েছে।");
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.productId || batchForm.quantityProduced <= 0) {
      showNotification("সঠিক প্রোডাক্ট ও উৎপাদনের পরিমাণ দিন।", "error");
      return;
    }

    const validItems = batchForm.items.filter((i) => i.materialId > 0 && i.quantityUsed > 0);
    if (validItems.length === 0) {
      showNotification("উৎপাদনে ব্যবহৃত অন্তত একটি উপাদান যোগ করুন।", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/materials/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...batchForm,
          items: validItems,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "উৎপাদন রেকর্ড সফলভাবে সেভ হয়েছে!");
        setIsBatchModalOpen(false);
        fetchData();
        setActiveTab("batches");
      } else {
        showNotification(json.error || "রেকর্ড সেভ করা যায়নি।", "error");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleDeleteBatch = async (batchId: number) => {
    if (
      !confirm(
        "আপনি কি এই উৎপাদন রেকর্ডটি ডিলিট করতে চান?\n\nএতে ব্যবহৃত কাঁচামাল স্টকে পুনরায় ফেরত যাবে এবং উৎপাদিত প্রোডাক্টের স্টক কমে যাবে।"
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/materials/batches?id=${batchId}&rollback=true`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        showNotification(json.message);
        setIsBatchDetailModalOpen(false);
        setSelectedBatchForDetail(null);
        fetchData();
      } else {
        showNotification(json.error, "error");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  // Helper for live batch costing in modal
  const liveBatchTotalCost = batchForm.items.reduce((sum, item) => {
    const mat = materials.find((m) => m.id === item.materialId);
    const cost = item.unitCost || (mat ? Number(mat.unitCost || 0) : 0);
    return sum + (item.quantityUsed || 0) * cost;
  }, 0);

  const liveBatchUnitCost =
    batchForm.quantityProduced > 0 ? liveBatchTotalCost / batchForm.quantityProduced : 0;

  const selectedBatchProduct = formulations.find((f) => f.id === batchForm.productId);

  // Helper for live formula costing in formula modal
  const liveFormulaTotalCost = formulaRows.reduce((sum, row) => {
    const mat = materials.find((m) => m.id === row.materialId);
    const unitCost = mat ? Number(mat.unitCost || 0) : 0;
    return sum + (row.quantityNeeded || 0) * unitCost;
  }, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {notification.show && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm animate-in fade-in slide-in-from-top-4 duration-200 ${
            notification.type === "success"
              ? "bg-emerald-900/90 text-white border-emerald-700 backdrop-blur-md"
              : "bg-rose-900/90 text-white border-rose-700 backdrop-blur-md"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
              কাঁচামাল ও উৎপাদন হিসাব
            </span>
            <span className="text-xs text-stone-500 font-medium">BOM & Production Batches</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-stone-900 flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-forest" />
            <span>কাঁচামাল, রেসিপি ও উৎপাদন ট্র্যাকিং</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 max-w-2xl">
            প্রোডাক্ট কি কি দিয়ে বানানো হচ্ছে, কবে কত টাকা দিয়ে কেনা হচ্ছে এবং কবে কোন প্রোডাক্ট কত পিস তৈরি করা হলো—সবকিছু এক ক্লিকে সংরক্ষণ ও হিসাব করুন।
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            onClick={() => openNewBatchModal()}
            className="px-4 py-2.5 rounded-xl bg-forest-deep hover:bg-forest text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Factory className="w-4 h-4" />
            <span>+ নতুন উৎপাদন রেকর্ড</span>
          </button>

          <button
            onClick={() => openPurchaseModal()}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>ক্রয় ভাউচার এন্ট্রি</span>
          </button>

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
            className="px-3.5 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন কাঁচামাল</span>
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
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center shrink-0">
            <Factory className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 block">সম্পন্ন উৎপাদন রেকর্ড</span>
            <span className="text-xl font-bold font-mono text-stone-900">
              {batchStats.totalBatchesCount} টি ব্যাচ ({batchStats.totalUnitsProduced} ইউনিট)
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-stone-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("materials")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
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
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "formulations"
              ? "border-forest text-forest"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>২. প্রোডাক্ট রেসিপি ও খরচ ({formulations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("batches")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "batches"
              ? "border-forest text-forest"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Factory className="w-4 h-4" />
          <span>৩. উৎপাদন রেকর্ড (কবে কী বানালাম) ({batches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("purchases")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "purchases"
              ? "border-forest text-forest"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>৪. ক্রয় ভাউচার লগ</span>
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
                placeholder="কাঁচামালের নাম, কোড বা মহাজন দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-forest"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-stone-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white text-stone-700 font-medium cursor-pointer"
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

          {/* Table */}
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                    <th className="py-3.5 px-4">কাঁচামাল ও কোড</th>
                    <th className="py-3.5 px-3">ক্যাটাগরি</th>
                    <th className="py-3.5 px-3">বর্তমান স্টক</th>
                    <th className="py-3.5 px-3">একক দর (৳)</th>
                    <th className="py-3.5 px-3">স্টক মূল্য (৳)</th>
                    <th className="py-3.5 px-3">মোট ক্রয়</th>
                    <th className="py-3.5 px-3">কোন কোন প্রোডাক্টে ব্যবহার হচ্ছে</th>
                    <th className="py-3.5 px-3">প্রধান সরবরাহকারী</th>
                    <th className="py-3.5 px-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-stone-400">
                        {loading ? "লোড হচ্ছে..." : "কোনো কাঁচামাল পাওয়া যায়নি।"}
                      </td>
                    </tr>
                  ) : (
                    filteredMaterials.map((mat) => {
                      const stockVal = Number(mat.currentStock) * Number(mat.unitCost);
                      const usedInProducts = mat.productIngredients || [];

                      return (
                        <tr key={mat.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-stone-900 text-sm">{mat.name}</div>
                            {mat.code && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                                {mat.code}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200/60">
                              {mat.category || "উপাদান"}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 font-mono">
                            <span
                              className={`font-bold px-2 py-0.5 rounded ${
                                mat.currentStock <= 5
                                  ? "bg-rose-50 text-rose-700 font-extrabold border border-rose-200"
                                  : "text-stone-800"
                              }`}
                            >
                              {Number(mat.currentStock).toLocaleString("bn-BD")} {mat.unit}
                            </span>
                            {mat.currentStock <= 5 && (
                              <span className="block text-[10px] text-rose-600 font-sans font-bold">
                                লো-স্টক!
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 font-mono text-stone-700">
                            {fmt(mat.unitCost)} / {mat.unit}
                          </td>

                          <td className="py-3.5 px-3 font-mono font-bold text-emerald-800">
                            {fmt(stockVal)}
                          </td>

                          <td className="py-3.5 px-3 font-mono text-stone-600">
                            <div>{fmt(mat.totalSpent)}</div>
                            <span className="text-[10px] text-stone-400">
                              ({Number(mat.totalPurchased).toLocaleString("bn-BD")} {mat.unit})
                            </span>
                          </td>

                          <td className="py-3.5 px-3 max-w-xs">
                            {usedInProducts.length === 0 ? (
                              <span className="text-stone-400 italic text-[11px]">
                                কোনো প্রোডাক্টে এখনো যুক্ত হয়নি
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {usedInProducts.map((pi) => (
                                  <span
                                    key={pi.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-forest/10 text-forest border border-forest/20"
                                    title={`১ ${pi.product.unit || "পিস"} তৈরিতে লাগে ${pi.quantityNeeded} ${pi.unit}`}
                                  >
                                    <ShoppingBag className="w-2.5 h-2.5" />
                                    <span>{pi.product.name}</span>
                                    <span className="font-mono text-stone-500 font-bold">
                                      ({pi.quantityNeeded} {pi.unit})
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="font-medium text-stone-800">{mat.supplier || "—"}</div>
                            {mat.supplierPhone && (
                              <div className="text-[10px] font-mono text-stone-400">
                                {mat.supplierPhone}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openPurchaseModal(mat)}
                                title="নতুন ক্রয় ভাউচার যোগ করুন"
                                className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-[11px] flex items-center gap-1 border border-amber-200 cursor-pointer"
                              >
                                <Receipt className="w-3 h-3" />
                                <span>মাল কিনুন</span>
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
                                title="এডিট করুন"
                                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={async () => {
                                  if (confirm(`আপনি কি "${mat.name}" কাঁচামালটি ডিলিট করতে চান?`)) {
                                    const res = await fetch(`/api/admin/materials/${mat.id}`, {
                                      method: "DELETE",
                                    });
                                    const json = await res.json();
                                    if (json.success) {
                                      showNotification(json.message);
                                      fetchData();
                                    } else {
                                      showNotification(json.error, "error");
                                    }
                                  }
                                }}
                                title="ডিলিট করুন"
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
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
      {/* TAB 2: PRODUCT FORMULATIONS & BOM                                          */}
      {/* ========================================================================= */}
      {activeTab === "formulations" && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-2xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold">বিল অফ ম্যাটেরিয়ালস (BOM) ও স্বয়ংক্রিয় উৎপাদন খরচ: </span>
              প্রতিটি প্রোডাক্ট তৈরি করতে কোন কোন কাঁচামাল কতটুকু প্রয়োজন তা নিচের তালিকা থেকে সেট করুন।
              সিস্টেম স্বয়ংক্রিয়ভাবে কাঁচামালের ক্রয়ের গড় দাম অনুসারে প্রতিটি প্রোডাক্টের উৎপাদন খরচ (COGS)
              এবং আনুমানিক লাভের হিসাব বের করে দেবে।
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {formulations.map((prod) => {
              const imageSrc =
                Array.isArray(prod.images) && prod.images.length > 0
                  ? prod.images[0]
                  : typeof prod.images === "string"
                  ? prod.images
                  : null;

              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-3xl border border-stone-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-forest/40 transition-all space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {imageSrc ? (
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-stone-200 bg-stone-50 shrink-0 relative">
                            <Image
                              src={imageSrc}
                              alt={prod.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-forest/10 text-forest flex items-center justify-center shrink-0">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">
                            {prod.category}
                          </span>
                          <h3 className="font-bold text-stone-900 text-sm line-clamp-1">
                            {prod.name}
                          </h3>
                          <div className="text-xs font-mono font-bold text-stone-700 mt-0.5">
                            বিক্রয় মূল্য: {fmt(prod.sellingPrice)} / {prod.unit}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={() => openFormulaModal(prod)}
                          className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-forest hover:text-white text-stone-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>রেসিপি সেট করুন</span>
                        </button>
                        <button
                          onClick={() => openNewBatchModal(prod.id)}
                          className="px-2 py-1 rounded-xl bg-forest/10 hover:bg-forest hover:text-white text-forest text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Factory className="w-2.5 h-2.5" />
                          <span>মাল বানান</span>
                        </button>
                      </div>
                    </div>

                    {/* Ingredients Breakdown */}
                    <div className="bg-stone-50/70 p-3 rounded-2xl border border-stone-200/60 space-y-2">
                      <div className="flex justify-between items-center text-xs font-semibold text-stone-600 border-b border-stone-200/60 pb-1.5">
                        <span>ব্যবহৃত উপাদান ({prod.ingredientsCount}টি)</span>
                        <span className="font-mono">প্রয়োজনীয় পরিমাণ</span>
                      </div>

                      {prod.ingredients.length === 0 ? (
                        <div className="text-center py-3 text-stone-400 text-xs italic">
                          এখনো কোনো উপাদান নির্ধারণ করা হয়নি।
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {prod.ingredients.map((ing) => (
                            <div
                              key={ing.id}
                              className="flex justify-between items-center text-xs text-stone-700"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-forest"></span>
                                <span className="font-medium">{ing.materialName}</span>
                              </div>
                              <div className="text-right font-mono">
                                <span className="font-bold text-stone-900">
                                  {ing.quantityNeeded} {ing.unit}
                                </span>
                                <span className="text-[10px] text-stone-400 block">
                                  ({fmt(ing.cost)})
                                </span>
                              </div>
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
      {/* TAB 3: PRODUCTION BATCHES & RUNS (কবে কী বানালাম)                          */}
      {/* ========================================================================= */}
      {activeTab === "batches" && (
        <div className="space-y-4">
          {/* Sub Header / Filters */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ব্যাচ নং, প্রোডাক্ট নাম বা কারিগর দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-forest"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-stone-400" />
              <select
                value={selectedBatchProductFilter}
                onChange={(e) => setSelectedBatchProductFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white text-stone-700 font-medium cursor-pointer"
              >
                <option value="ALL">সকল প্রোডাক্ট</option>
                {formulations.map((p) => (
                  <option key={p.id} value={p.id.toString()}>
                    {p.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => openNewBatchModal()}
                className="px-3.5 py-2 rounded-xl bg-forest hover:bg-forest-deep text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন উৎপাদন ব্যাচ</span>
              </button>
            </div>
          </div>

          {/* Batches Table / Cards */}
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Factory className="w-4 h-4 text-forest" />
                <span>সম্পন্ন উৎপাদন ব্যাচ ও কাঁচামাল ব্যবহারের ইতিহাস</span>
              </h3>
              <span className="text-xs font-mono text-stone-500 font-semibold">
                মোট {filteredBatches.length} টি ব্যাচ রেকর্ড
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                    <th className="py-3.5 px-4">ব্যাচ নং ও তারিখ</th>
                    <th className="py-3.5 px-3">প্রোডাক্ট</th>
                    <th className="py-3.5 px-3">উৎপাদিত পরিমাণ</th>
                    <th className="py-3.5 px-3">কোন কোন জিনিস দিয়ে বানালাম</th>
                    <th className="py-3.5 px-3">মোট কাঁচামাল খরচ</th>
                    <th className="py-3.5 px-3">প্রতি পিসে খরচ</th>
                    <th className="py-3.5 px-3">কারিগর / অপারেটর</th>
                    <th className="py-3.5 px-3">স্টক স্ট্যাটাস</th>
                    <th className="py-3.5 px-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-stone-400">
                        {loading ? "লোড হচ্ছে..." : "এখনো কোনো উৎপাদন রেকর্ড নেই। উপরের '+ নতুন উৎপাদন রেকর্ড' বাটনে ক্লিক করে প্রথম ব্যাচ তৈরি করুন।"}
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((b) => {
                      const imageSrc =
                        Array.isArray(b.productImages) && b.productImages.length > 0
                          ? b.productImages[0]
                          : typeof b.productImages === "string"
                          ? b.productImages
                          : null;

                      return (
                        <tr key={b.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-stone-900 block text-xs">
                              {b.batchNumber}
                            </span>
                            <span className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-stone-400" />
                              {new Date(b.productionDate).toLocaleDateString("bn-BD")}
                            </span>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2.5">
                              {imageSrc ? (
                                <div className="w-8 h-8 rounded-lg overflow-hidden border border-stone-200 bg-stone-50 shrink-0 relative">
                                  <Image
                                    src={imageSrc}
                                    alt={b.productName}
                                    fill
                                    sizes="32px"
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-forest/10 text-forest flex items-center justify-center shrink-0">
                                  <Package className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-stone-900 line-clamp-1">
                                  {b.productName}
                                </span>
                                <span className="text-[10px] text-stone-400 block">
                                  {b.productCategory}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-mono">
                            <span className="font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                              {Number(b.quantityProduced).toLocaleString("bn-BD")} {b.unit}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {b.items.map((item) => (
                                <span
                                  key={item.id}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-900 border border-amber-200/60"
                                  title={`${item.materialName}: ${item.quantityUsed} ${item.unit} (মোট ${fmt(item.totalCost)})`}
                                >
                                  <span>{item.materialName}:</span>
                                  <span className="font-mono font-bold text-stone-700">
                                    {item.quantityUsed} {item.unit}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-mono font-bold text-stone-900">
                            {fmt(b.totalCost)}
                          </td>

                          <td className="py-3.5 px-3 font-mono font-bold text-forest">
                            {fmt(b.unitCost)} / {b.unit}
                          </td>

                          <td className="py-3.5 px-3 text-stone-700">
                            {b.operatorName ? (
                              <div className="flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-stone-400" />
                                <span>{b.operatorName}</span>
                              </div>
                            ) : (
                              <span className="text-stone-400 italic">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="flex flex-col gap-1 text-[10px]">
                              {b.deductedStock ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                  <Check className="w-3 h-3" /> কাঁচামাল কাটা হয়েছে
                                </span>
                              ) : (
                                <span className="text-stone-400">কাঁচামাল কাটা হয়নি</span>
                              )}
                              {b.addedToStock && (
                                <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
                                  <Check className="w-3 h-3" /> স্টকে যোগ হয়েছে
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedBatchForDetail(b);
                                  setIsBatchDetailModalOpen(true);
                                }}
                                title="উৎপাদন চালান ও বিবরণ দেখুন"
                                className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-forest hover:text-white text-stone-700 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>বিবরণী</span>
                              </button>

                              <button
                                onClick={() => handleDeleteBatch(b.id)}
                                title="রেকর্ড ডিলিট ও স্টক রোলব্যাক"
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
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
      {/* TAB 4: PURCHASES VOUCHERS LOG                                             */}
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
                      .sort(
                        (a, b) =>
                          new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
                      )
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
                    onChange={(e) =>
                      setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">ক্রয়ের পরিমাণ *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min={0.001}
                    value={purchaseForm.quantity}
                    onChange={(e) => {
                      const qty = parseFloat(e.target.value) || 0;
                      setPurchaseForm({
                        ...purchaseForm,
                        quantity: qty,
                        totalCost: qty * purchaseForm.unitPrice,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">প্রতি একক মূল্য (৳)</label>
                  <input
                    type="number"
                    step="any"
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
                  <label className="font-semibold text-stone-700">মোট খরচ (৳) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={purchaseForm.totalCost}
                    onChange={(e) => {
                      const total = parseFloat(e.target.value) || 0;
                      const unitP = purchaseForm.quantity > 0 ? total / purchaseForm.quantity : 0;
                      setPurchaseForm({
                        ...purchaseForm,
                        totalCost: total,
                        unitPrice: Math.round(unitP * 100) / 100,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs font-bold text-emerald-800 bg-emerald-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">সরবরাহকারী / দোকান</label>
                  <input
                    type="text"
                    placeholder="কার কাছ থেকে কেনা হয়েছে"
                    value={purchaseForm.supplierName}
                    onChange={(e) =>
                      setPurchaseForm({ ...purchaseForm, supplierName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">চালান / মেমো / বিল নং</label>
                  <input
                    type="text"
                    placeholder="ক্যাশমেমো নং..."
                    value={purchaseForm.invoiceNumber}
                    onChange={(e) =>
                      setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">নোট বা মন্তব্য</label>
                <textarea
                  rows={2}
                  placeholder="কোন লটের মাল বা কোয়ালিটি সম্পর্কিত কোনো তথ্য..."
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
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
                  ভাউচার সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PRODUCTION BATCH RUN (কবে কী বানালাম)                             */}
      {/* ========================================================================= */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Factory className="w-5 h-5 text-forest" />
                  <span>নতুন উৎপাদন রেকর্ড (কবে কী বানালাম)</span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  কোন জিনিস দিয়ে কোন প্রোডাক্ট কত পিস কবে বানানো হলো তা সেভ করুন।
                </p>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="space-y-4 text-xs">
              {/* Product and Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">কোন প্রোডাক্ট তৈরি করলেন? *</label>
                  <select
                    required
                    value={batchForm.productId}
                    onChange={(e) => {
                      const id = parseInt(e.target.value, 10);
                      handleProductSelectForBatch(id);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 font-bold text-sm text-stone-900 cursor-pointer bg-white"
                  >
                    {formulations.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit}) — বিক্রয়: {fmt(p.sellingPrice)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-stone-700">উৎপাদনের পরিমাণ *</label>
                    <input
                      type="number"
                      step="any"
                      min={0.01}
                      required
                      value={batchForm.quantityProduced}
                      onChange={(e) => {
                        const q = parseFloat(e.target.value) || 0;
                        setBatchForm({ ...batchForm, quantityProduced: q });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs font-bold text-stone-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-stone-700">পরিমাপের একক</label>
                    <input
                      type="text"
                      value={batchForm.unit}
                      onChange={(e) => setBatchForm({ ...batchForm, unit: e.target.value })}
                      placeholder="যেমন: bottle, piece"
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Batch No & Production Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">ব্যাচ / লট নম্বর *</label>
                  <input
                    type="text"
                    required
                    value={batchForm.batchNumber}
                    onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">কবে বানানো হলো (তারিখ) *</label>
                  <input
                    type="date"
                    required
                    value={batchForm.productionDate}
                    onChange={(e) => setBatchForm({ ...batchForm, productionDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">কারিগর / অপারেটর</label>
                  <input
                    type="text"
                    placeholder="কে তৈরি করলো"
                    value={batchForm.operatorName}
                    onChange={(e) => setBatchForm({ ...batchForm, operatorName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
                  />
                </div>
              </div>

              {/* Ingredients consumed in this batch */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-stone-800 text-xs">
                      ব্যবহৃত উপাদানের হিসাব (Raw Materials Used):
                    </span>
                    <span className="text-[11px] text-stone-400 block">
                      এই ব্যাচে মোট কোন কোন জিনিস কতটুকু খরচ হয়েছে
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={recalculateBatchItemsFromRecipe}
                      className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-[11px] border border-amber-200 transition-colors cursor-pointer"
                    >
                      রেসিপি অনুযায়ী রিক্যালকুলেট
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBatchForm((prev) => ({
                          ...prev,
                          items: [
                            ...prev.items,
                            {
                              materialId: materials.length > 0 ? materials[0].id : 0,
                              quantityUsed: 1,
                              unit: materials.length > 0 ? materials[0].unit : "kg",
                              unitCost: materials.length > 0 ? Number(materials[0].unitCost || 0) : 0,
                            },
                          ],
                        }));
                      }}
                      className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-[11px] transition-colors cursor-pointer"
                    >
                      + অতিরিক্ত উপাদান যোগ
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {batchForm.items.map((row, idx) => {
                    const selectedMat = materials.find((m) => m.id === row.materialId);
                    const itemCost = row.quantityUsed * (row.unitCost || 0);

                    return (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200/80"
                      >
                        <div className="w-full sm:flex-1">
                          <select
                            value={row.materialId}
                            onChange={(e) => {
                              const mId = parseInt(e.target.value, 10);
                              const mObj = materials.find((m) => m.id === mId);
                              const updated = [...batchForm.items];
                              updated[idx].materialId = mId;
                              if (mObj) {
                                updated[idx].unit = mObj.unit;
                                updated[idx].unitCost = Number(mObj.unitCost || 0);
                              }
                              setBatchForm({ ...batchForm, items: updated });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-medium"
                          >
                            {materials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} (মজুত: {m.currentStock} {m.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-full sm:w-28 flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            min={0.001}
                            placeholder="পরিমাণ"
                            value={row.quantityUsed}
                            onChange={(e) => {
                              const q = parseFloat(e.target.value) || 0;
                              const updated = [...batchForm.items];
                              updated[idx].quantityUsed = q;
                              setBatchForm({ ...batchForm, items: updated });
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-stone-200 bg-white font-mono text-center text-xs font-bold"
                          />
                          <span className="text-[11px] font-mono text-stone-500 shrink-0">
                            {row.unit}
                          </span>
                        </div>

                        <div className="w-full sm:w-28 text-right font-mono shrink-0">
                          <span className="text-[10px] text-stone-400 block">খরচ:</span>
                          <span className="font-bold text-stone-900">{fmt(itemCost)}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = batchForm.items.filter((_, i) => i !== idx);
                            setBatchForm({ ...batchForm, items: updated });
                          }}
                          className="p-1 rounded-md text-rose-500 hover:bg-rose-100 cursor-pointer shrink-0"
                          title="সরান"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Costing and Options */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-stone-800">
                  <div>
                    <span className="text-[10px] text-stone-500 block">ব্যাচের মোট কাঁচামাল খরচ:</span>
                    <span className="font-mono font-bold text-sm text-stone-900">
                      {fmt(liveBatchTotalCost)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">প্রতি পিসে খরচ (Unit Cost):</span>
                    <span className="font-mono font-bold text-sm text-forest">
                      {fmt(liveBatchUnitCost)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">প্রোডাক্ট বিক্রয় মূল্য:</span>
                    <span className="font-mono font-bold text-sm text-emerald-800">
                      {selectedBatchProduct ? fmt(selectedBatchProduct.sellingPrice) : "—"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                    <input
                      type="checkbox"
                      checked={batchForm.deductedStock}
                      onChange={(e) =>
                        setBatchForm({ ...batchForm, deductedStock: e.target.checked })
                      }
                      className="rounded text-forest focus:ring-forest cursor-pointer"
                    />
                    <span>কাঁচামাল বর্তমান স্টক থেকে স্বয়ংক্রিয়ভাবে বিয়োগ করুন</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                    <input
                      type="checkbox"
                      checked={batchForm.addedToStock}
                      onChange={(e) =>
                        setBatchForm({ ...batchForm, addedToStock: e.target.checked })
                      }
                      className="rounded text-forest focus:ring-forest cursor-pointer"
                    />
                    <span>তৈরি করা পরিমাণ প্রোডাক্ট স্টকে যোগ করুন</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">নোট / বিশেষ বিবরণ</label>
                <textarea
                  rows={2}
                  placeholder="যেমন: আজকের ব্যাচে সরিষার তেলের ঝাঁঝ খুব ভালো হয়েছে..."
                  value={batchForm.notes}
                  onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-forest hover:bg-forest-deep text-white font-bold transition-colors cursor-pointer"
                >
                  উৎপাদন রেকর্ড সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: BATCH DETAIL & PRINTABLE SLIP (উৎপাদন বিবরণী চালান)               */}
      {/* ========================================================================= */}
      {isBatchDetailModalOpen && selectedBatchForDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-stone-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-forest/10 text-forest flex items-center justify-center">
                  <Factory className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">উৎপাদন ব্যাচ চালান ও বিবরণী</h2>
                  <span className="font-mono text-xs text-stone-500 font-bold">
                    ব্যাচ নং: {selectedBatchForDetail.batchNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsBatchDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs">
              <div>
                <span className="text-[10px] text-stone-400 block">উৎপাদিত প্রোডাক্ট:</span>
                <span className="font-bold text-stone-900 block">{selectedBatchForDetail.productName}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block">উৎপাদনের পরিমাণ:</span>
                <span className="font-mono font-bold text-emerald-800">
                  {selectedBatchForDetail.quantityProduced} {selectedBatchForDetail.unit}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block">উৎপাদনের তারিখ:</span>
                <span className="font-mono text-stone-700">
                  {new Date(selectedBatchForDetail.productionDate).toLocaleDateString("bn-BD")}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block">কারিগর / অপারেটর:</span>
                <span className="font-medium text-stone-800">
                  {selectedBatchForDetail.operatorName || "নির্ধারিত নেই"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block">মোট কাঁচামাল খরচ:</span>
                <span className="font-mono font-bold text-stone-900">
                  {fmt(selectedBatchForDetail.totalCost)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block">প্রতি ইউনিটে খরচ:</span>
                <span className="font-mono font-bold text-forest">
                  {fmt(selectedBatchForDetail.unitCost)}
                </span>
              </div>
            </div>

            {/* Consumed Materials Table */}
            <div className="space-y-2">
              <span className="font-bold text-stone-800 text-xs block">
                এই ব্যাচে ব্যবহৃত উপাদানের বিস্তারিত তালিকা:
              </span>
              <div className="rounded-xl border border-stone-200 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">উপাদান</th>
                      <th className="py-2 px-3">ব্যবহারের পরিমাণ</th>
                      <th className="py-2 px-3">একক দর</th>
                      <th className="py-2 px-3 text-right">মোট খরচ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono">
                    {selectedBatchForDetail.items.map((item) => (
                      <tr key={item.id} className="hover:bg-stone-50/50">
                        <td className="py-2 px-3 font-sans font-medium text-stone-900">
                          {item.materialName}
                        </td>
                        <td className="py-2 px-3 font-bold text-stone-800">
                          {item.quantityUsed} {item.unit}
                        </td>
                        <td className="py-2 px-3 text-stone-600">{fmt(item.unitCost)}</td>
                        <td className="py-2 px-3 text-right font-bold text-stone-900">
                          {fmt(item.totalCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedBatchForDetail.notes && (
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900">
                <span className="font-semibold block text-[10px] text-amber-700">মন্তব্য:</span>
                <p>{selectedBatchForDetail.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
              <button
                type="button"
                onClick={() => handleDeleteBatch(selectedBatchForDetail.id)}
                className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ব্যাচ ডিলিট ও রোলব্যাক</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>প্রিন্ট করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsBatchDetailModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-forest hover:bg-forest-deep text-white font-bold cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: RECIPE / FORMULATION BUILDER (BOM)                                */}
      {/* ========================================================================= */}
      {isFormulaModalOpen && selectedProductForFormula && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-forest" />
                  <span>প্রোডাক্ট রেসিপি ও বিল অফ ম্যাটেরিয়ালস (BOM)</span>
                </h2>
                <span className="text-xs text-stone-500 font-medium">
                  {selectedProductForFormula.name} ({selectedProductForFormula.unit || "১ পিস"} তৈরিতে কী কী লাগে)
                </span>
              </div>
              <button
                onClick={() => setIsFormulaModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center bg-stone-50 p-3 rounded-2xl border border-stone-200/80">
                <div>
                  <span className="text-stone-500 block">বিক্রয় মূল্য:</span>
                  <span className="text-sm font-bold font-mono text-stone-900">
                    {fmt(selectedProductForFormula.sellingPrice)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormulaRows([
                      ...formulaRows,
                      {
                        materialId: materials.length > 0 ? materials[0].id : 0,
                        quantityNeeded: 1,
                        unit: materials.length > 0 ? materials[0].unit : "kg",
                        notes: "",
                      },
                    ]);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-forest hover:bg-forest-deep text-white font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>উপাদান যোগ করুন</span>
                </button>
              </div>

              {/* Rows */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {formulaRows.map((row, idx) => {
                  const selectedMat = materials.find((m) => m.id === row.materialId);
                  const rowCost = (row.quantityNeeded || 0) * (selectedMat ? Number(selectedMat.unitCost || 0) : 0);

                  return (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row items-center gap-2 p-3 rounded-2xl bg-stone-50 border border-stone-200/80"
                    >
                      <div className="w-full sm:flex-1">
                        <label className="text-[10px] text-stone-500 block mb-0.5">কাঁচামাল / উপাদান</label>
                        <select
                          value={row.materialId}
                          onChange={(e) => {
                            const newMatId = parseInt(e.target.value, 10);
                            const mObj = materials.find((m) => m.id === newMatId);
                            const updated = [...formulaRows];
                            updated[idx].materialId = newMatId;
                            if (mObj) updated[idx].unit = mObj.unit;
                            setFormulaRows(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white font-medium text-stone-800"
                        >
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({fmt(m.unitCost)} / {m.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full sm:w-28">
                        <label className="text-[10px] text-stone-500 block mb-0.5">প্রয়োজনীয় পরিমাণ</label>
                        <input
                          type="number"
                          step="any"
                          min={0.001}
                          value={row.quantityNeeded}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const updated = [...formulaRows];
                            updated[idx].quantityNeeded = val;
                            setFormulaRows(updated);
                          }}
                          className="w-full px-2 py-1.5 rounded-xl border border-stone-200 bg-white font-mono text-center font-bold text-stone-900"
                        />
                      </div>

                      <div className="w-full sm:w-20">
                        <label className="text-[10px] text-stone-500 block mb-0.5">একক</label>
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
