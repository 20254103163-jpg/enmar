"use client";
import ConfirmModal from "@/components/ui/ConfirmModal";
import AlertModal from "@/components/ui/AlertModal";
// app/admin/categories/page.tsx

import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Edit2, Trash2, Layers, Loader2, Save, X, Leaf } from "lucide-react";
import ImageUploader from "@/components/admin/ImageUploader";
import { getSafeImageUrl } from "@/lib/utils";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; category: any | null }>({
    isOpen: false,
    category: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: "success" | "error" | "warning" | "info" }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const [formData, setFormData] = useState({
    name: "",
    icon: "leaf",
    image: "",
    description: "",
    displayOrder: 0,
    isActive: true,
  });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const json = await res.json();
      if (json.success) setCategories(json.categories);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setEditingCat(null);
    setFormData({
      name: "",
      icon: "leaf",
      image: "",
      description: "",
      displayOrder: categories.length,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setEditingCat(cat);
    setFormData({
      name: cat.name || "",
      icon: cat.icon || "leaf",
      image: cat.image || "",
      description: cat.description || "",
      displayOrder: cat.displayOrder || 0,
      isActive: Boolean(cat.isActive),
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setSaving(true);
    try {
      const url = editingCat
        ? `/api/admin/categories/${editingCat.id}`
        : "/api/admin/categories";
      const method = editingCat ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Save failed");

      setModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        title: "Category Save Error",
        message: err.message || "Failed to save category.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deleteModalState.category) return;
    const { id, name } = deleteModalState.category;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setDeleteModalState({ isOpen: false, category: null });
        fetchCategories();
        setAlertState({
          isOpen: true,
          title: "Category Removed",
          message: `Category "${name}" was moved to the recycle bin.`,
          type: "success",
        });
      } else {
        setAlertState({
          isOpen: true,
          title: "Delete Error",
          message: json.error || "Failed to delete category.",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-ink">Food Categories</h2>
          <p className="text-sm text-ink-soft">
            Manage your food catalog departments and navigation sections.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest hover:bg-forest-deep text-white font-semibold text-sm shadow-premium transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center text-ink-soft">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-forest mb-2" />
            <span>Loading categories...</span>
          </div>
        ) : (
          categories.map((cat, idx) => (
            <div
              key={cat.id}
              className="bg-paper p-6 rounded-3xl border border-line shadow-card hover:shadow-premium transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-forest-soft text-forest flex items-center justify-center font-bold text-lg overflow-hidden border border-line">
                    {cat.image ? (
                      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gradient-to-b from-stone-50 to-stone-100 flex items-center justify-center p-1">
                        <Image
                          src={getSafeImageUrl(cat.image)}
                          alt={cat.name}
                          fill
                          className="object-contain p-0.5 drop-shadow-xs"
                          unoptimized={true}
                        />
                      </div>
                    ) : (
                      <Leaf className="w-6 h-6 text-forest" />
                    )}
                  </div>

                  <span className="px-2.5 py-1 rounded-md bg-bg border border-line text-xs font-mono font-medium text-ink-soft">
                    Order: {cat.displayOrder}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold font-display text-lg text-ink">{cat.name}</h3>
                  <p className="text-xs text-ink-soft mt-1 line-clamp-2">
                    {cat.description || "No description provided."}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-line mt-4 flex items-center justify-between text-xs text-ink-soft">
                <span>{cat._count?.products || 0} Products</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-1.5 rounded-lg hover:bg-bg text-ink-soft hover:text-forest transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteModalState({ isOpen: true, category: cat })}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-ink-soft hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-paper rounded-3xl border border-line shadow-floating max-w-lg w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h3 className="text-xl font-bold font-display text-ink">
                {editingCat ? `Edit Category #${editingCat.id}` : "Create New Category"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-bg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-ink">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Honey & Sweeteners"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-bg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-ink">Description</label>
                <textarea
                  rows={2}
                  placeholder="Short description for storefront category cards"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-bg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-ink">Display Order</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, displayOrder: Number(e.target.value) })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-bg border border-line text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-ink">Icon Token</label>
                  <input
                    type="text"
                    placeholder="leaf, honey, oil, spice"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-bg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
                  />
                </div>
              </div>

              {/* Category Image Upload */}
              <div className="space-y-1.5">
                <ImageUploader
                  images={formData.image ? [formData.image] : []}
                  onChange={(imgs) => setFormData({ ...formData, image: imgs[0] || "" })}
                  multiple={false}
                  label="Category Cover Image"
                  helperText="Upload custom category banner or icon"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-line text-ink text-sm hover:bg-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-forest hover:bg-forest-deep text-white font-semibold text-sm shadow-premium disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, category: null })}
        onConfirm={confirmDeleteCategory}
        title="Delete Food Category?"
        message={`Are you sure you want to remove "${deleteModalState.category?.name || ""}" from categories?\n\nThis will archive the category to the recycle bin.`}
        confirmText="Delete Category"
        cancelText="Keep Category"
        type="danger"
        isLoading={deleting}
      />

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
