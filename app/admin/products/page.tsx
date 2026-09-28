"use client";
// app/admin/products/page.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Leaf,
  Layers,
  CheckCircle,
  AlertCircle,
  Package,
  CheckSquare,
  Square,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { formatTaka, formatProductUnit, getSafeImageUrl } from "@/lib/utils";
import ConfirmModal from "@/components/ui/ConfirmModal";
import AlertModal from "@/components/ui/AlertModal";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals state
  const [singleDeleteProduct, setSingleDeleteProduct] = useState<any | null>(null);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (selectedCategory && selectedCategory !== "all") query.set("categoryId", selectedCategory);

      const res = await fetch("/api/admin/products?" + query.toString());
      const json = await res.json();
      if (json.success) {
        setProducts(json.products || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/categories");
      const json = await res.json();
      if (json.success) setCategories(json.categories || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
    setSelectedIds([]);
  }, [search, selectedCategory]);

  const handleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const confirmSingleDelete = async () => {
    if (!singleDeleteProduct) return;
    const { id, name } = singleDeleteProduct;
    setDeleting(true);

    try {
      const res = await fetch("/api/admin/products/" + id, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
        setSingleDeleteProduct(null);
        setAlertState({
          isOpen: true,
          title: "Moved to Recycle Bin",
          message: `"${name}" was moved to the recycle bin. You can restore it anytime.`,
          type: "success",
        });
      } else {
        setAlertState({
          isOpen: true,
          title: "Delete Error",
          message: json.error || "Failed to delete product.",
          type: "error",
        });
      }
    } catch (e: any) {
      setAlertState({
        isOpen: true,
        title: "Delete Error",
        message: e.message || "An unexpected error occurred.",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);

    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: selectedIds }),
      });
      const json = await res.json();
      if (json.success) {
        setProducts((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
        setAlertState({
          isOpen: true,
          title: "Batch Deleted",
          message: json.message || `${selectedIds.length} products moved to Recycle Bin.`,
          type: "success",
        });
        setSelectedIds([]);
        setBulkDeleteModalOpen(false);
      } else {
        setAlertState({
          isOpen: true,
          title: "Bulk Delete Failed",
          message: json.error || "Could not delete selected products.",
          type: "error",
        });
      }
    } catch (e: any) {
      setAlertState({
        isOpen: true,
        title: "Error",
        message: e.message || "An unexpected error occurred.",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkStockUpdate = async () => {
    if (selectedIds.length === 0) return;
    const input = window.prompt(`Enter new stock quantity for ${selectedIds.length} selected products:`, "50");
    if (input === null) return;
    const stock = parseInt(input, 10);
    if (isNaN(stock) || stock < 0) {
      alert("Please enter a valid non-negative number.");
      return;
    }

    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_stock", ids: selectedIds, stock }),
      });
      const json = await res.json();
      if (json.success) {
        setAlertState({
          isOpen: true,
          title: "Stock Updated",
          message: json.message,
          type: "success",
        });
        fetchProducts();
      } else {
        setAlertState({
          isOpen: true,
          title: "Update Failed",
          message: json.error,
          type: "error",
        });
      }
    } catch (e: any) {
      setAlertState({
        isOpen: true,
        title: "Error",
        message: e.message,
        type: "error",
      });
    }
  };

  const handleBulkPriceUpdate = async () => {
    if (selectedIds.length === 0) return;
    const input = window.prompt(
      `Enter price percentage change for ${selectedIds.length} products (e.g. 10 for +10%, -5 for -5% discount):`,
      "10"
    );
    if (input === null) return;
    const percentChange = parseFloat(input);
    if (isNaN(percentChange)) {
      alert("Please enter a valid percentage number.");
      return;
    }

    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_price", ids: selectedIds, percentChange }),
      });
      const json = await res.json();
      if (json.success) {
        setAlertState({
          isOpen: true,
          title: "Prices Updated",
          message: json.message,
          type: "success",
        });
        fetchProducts();
      } else {
        setAlertState({
          isOpen: true,
          title: "Update Failed",
          message: json.error,
          type: "error",
        });
      }
    } catch (e: any) {
      setAlertState({
        isOpen: true,
        title: "Error",
        message: e.message,
        type: "error",
      });
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-paper p-4 rounded-2xl border border-line shadow-card">
        <div>
          <h2 className="text-xl font-bold font-display text-ink">Product Catalog</h2>
          <p className="text-xs text-ink-soft">
            Manage your organic food products, inventory stock, and bulk product management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/bin"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg hover:bg-stone-200 text-ink-soft hover:text-ink font-semibold text-xs border border-line transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Recycle Bin</span>
          </Link>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-forest hover:bg-forest-deep text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-paper p-3 rounded-2xl border border-line shadow-xs flex flex-col md:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            placeholder="Search by product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-bg border border-line text-xs focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft shrink-0">
            <Filter className="w-3 h-3" />
            <span>Category:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-bg border border-line text-xs font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={fetchProducts}
            className="p-1.5 rounded-lg bg-bg border border-line hover:bg-stone-200 text-ink-soft hover:text-ink transition-colors cursor-pointer"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Bulk Action Sticky Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-forest-deep text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in sticky top-16 z-20 border border-white/20">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent text-forest-deep flex items-center justify-center font-bold text-xs">
              {selectedIds.length}
            </div>
            <span className="text-xs font-semibold">
              {selectedIds.length} Products Selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleBulkStockUpdate}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Package className="w-3 h-3" />
              <span>Stock</span>
            </button>
            <button
              type="button"
              onClick={handleBulkPriceUpdate}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <span>৳ Price %</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors cursor-pointer"
            >
              Deselect
            </button>
            <button
              type="button"
              onClick={() => setBulkDeleteModalOpen(true)}
              className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-paper rounded-2xl border border-line shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg/60 text-ink-soft text-[10px] uppercase tracking-wider border-b border-line">
              <tr>
                <th className="py-2.5 px-3 w-8 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="cursor-pointer text-ink-soft hover:text-forest"
                    title={selectedIds.length === products.length ? "Deselect All" : "Select All"}
                  >
                    {products.length > 0 && selectedIds.length === products.length ? (
                      <CheckSquare className="w-4 h-4 text-forest" />
                    ) : (
                      <Square className="w-4 h-4 text-ink-soft" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Price</th>
                <th className="py-2.5 px-3">Stock Status</th>
                <th className="py-2.5 px-3">Badge / Deal</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-ink-soft space-y-1">
                    <Loader2 className="w-5 h-5 animate-spin text-forest mx-auto" />
                    <p className="text-xs">Loading catalog...</p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-ink-soft text-xs">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const imageSrc = getSafeImageUrl(p.images);

                  const isSelected = selectedIds.includes(p.id);
                  const isLowStock = p.stockQuantity <= 10;
                  const isOutOfStock = p.stockQuantity === 0;

                  return (
                    <tr
                      key={p.id}
                      className={"transition-colors " + (isSelected ? "bg-forest-soft/30" : "hover:bg-bg/50")}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(p.id)}
                          className="cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-forest" />
                          ) : (
                            <Square className="w-4 h-4 text-ink-soft hover:text-stone-700" />
                          )}
                        </button>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-bg border border-line shrink-0 flex items-center justify-center p-0.5 shadow-2xs">
                            <Image
                              src={imageSrc}
                              alt={p.name}
                              fill
                              className="object-contain p-0.5"
                              unoptimized={true}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-ink text-xs truncate max-w-[200px] sm:max-w-xs">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-ink-soft flex items-center gap-1.5 mt-0.5">
                              <span>Unit: {formatProductUnit(p.unitQuantity, p.unit)}</span>
                              {p.organicCertified && (
                                <span className="inline-flex items-center gap-0.5 text-forest font-semibold text-[9px] bg-forest/10 px-1 py-0.2 rounded">
                                  <Leaf className="w-2.5 h-2.5" />
                                  Organic
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-soft bg-bg px-2 py-0.5 rounded-md border border-line">
                          <Layers className="w-3 h-3 text-ink-soft" />
                          {p.category?.name || "Uncategorized"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div>
                          {p.discountPrice ? (
                            <div className="flex flex-col">
                              <span className="font-bold text-forest text-xs font-mono">
                                {formatTaka(p.discountPrice)}
                              </span>
                              <span className="text-[10px] text-ink-soft line-through font-mono">
                                {formatTaka(p.price)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-semibold text-ink text-xs font-mono">
                              {formatTaka(p.price)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div>
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              <AlertCircle className="w-3 h-3" />
                              Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <AlertCircle className="w-3 h-3" />
                              Low ({p.stockQuantity})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-forest bg-forest/10 px-2 py-0.5 rounded-md">
                              <CheckCircle className="w-3 h-3" />
                              {p.stockQuantity} in stock
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {p.isCombo && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Combo
                            </span>
                          )}
                          {p.isFeatured && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Featured
                            </span>
                          )}
                          {p.badge && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {p.badge}
                            </span>
                          )}
                          {!p.isCombo && !p.isFeatured && !p.badge && (
                            <span className="text-ink-soft text-[10px]">—</span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="p-1 rounded-md bg-bg hover:bg-forest hover:text-white border border-line text-ink-soft transition-colors cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setSingleDeleteProduct(p)}
                            className="p-1 rounded-md bg-bg hover:bg-rose-50 hover:text-rose-600 border border-line text-ink-soft transition-colors cursor-pointer"
                            title="Move to Recycle Bin"
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

      {/* Single Product Delete Modal (Instant response, 0 safety delay lock) */}
      <ConfirmModal
        isOpen={!!singleDeleteProduct}
        title="Move to Recycle Bin?"
        message={`Are you sure you want to move "${singleDeleteProduct?.name || ""}" to the Recycle Bin? You can restore it anytime.`}
        confirmText="Move to Trash"
        type="warning"
        isLoading={deleting}
        onConfirm={confirmSingleDelete}
        onClose={() => setSingleDeleteProduct(null)}
      />

      {/* Bulk Delete Modal (Instant response, 0 safety delay lock) */}
      <ConfirmModal
        isOpen={bulkDeleteModalOpen}
        title={`Move ${selectedIds.length} Products to Recycle Bin?`}
        message={`Are you sure you want to move ${selectedIds.length} selected products to the Recycle Bin? They will be removed from the active storefront but can be restored anytime.`}
        confirmText={`Delete ${selectedIds.length} Products`}
        type="danger"
        isLoading={deleting}
        onConfirm={confirmBulkDelete}
        onClose={() => setBulkDeleteModalOpen(false)}
      />

      {/* Alert Notification Modal */}
      <AlertModal
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type || "info"}
        onClose={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
