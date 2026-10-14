"use client";
// components/admin/Sidebar.tsx

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Trash2,
  Bike,
  Sliders,
  FileText,
  Package,
  Layers,
  ShoppingBag,
  Boxes,
  TicketPercent,
  Palette,
  ExternalLink,
  BellRing,
  KeyRound,
  Users,
  RotateCcw,
  Database,
  BarChart3,
  UserCheck,
  X,
  LogOut,
  Coins,
  Calendar,
  Utensils,
  Star,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function AdminSidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    name?: string;
    email?: string;
    role?: string;
  } | null>(null);

  const [permissions, setPermissions] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("enmar_customer");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {}

    const fetchPermissions = async () => {
      try {
        const res = await fetch("/api/admin/staff/permissions");
        const json = await res.json();
        if (json.success) {
          setPermissions(json.permissions || []);
          if (json.liveRole) {
            setCurrentUser((prev) => {
              if (prev && prev.role !== json.liveRole) {
                const updated = { ...prev, role: json.liveRole };
                try {
                  localStorage.setItem("enmar_customer", JSON.stringify(updated));
                } catch (e) {}
                return updated;
              }
              return prev;
            });
          }
        }
      } catch (e) {}
    };

    fetchPermissions();
    const interval = setInterval(fetchPermissions, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {}
    localStorage.removeItem("enmar_customer");
    localStorage.removeItem("enmar_admin_email");
    router.replace("/auth/login");
  };

  const canAccess = (moduleName: string, superAdminOnly: boolean = false) => {
    if (!currentUser?.role) return false;
    if (currentUser.role === "SUPER_ADMIN") return true;
    if (superAdminOnly) return false;
    if (moduleName === "dashboard") return true;

    const perm = permissions.find(
      (p) => p.role === currentUser.role && p.module === moduleName
    );
    if (!perm) {
      return currentUser.role === "ADMIN";
    }
    return Boolean(perm.canRead);
  };

  // Section 1: Core Operations
  const coreItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard, module: "dashboard" },
    { label: "Orders & Tracking", href: "/admin/orders", icon: ShoppingBag, module: "orders" },
    { label: "Products Catalog", href: "/admin/products", icon: Package, module: "products" },
    { label: "Categories", href: "/admin/categories", icon: Layers, module: "products" },
    { label: "Inventory Stock", href: "/admin/inventory", icon: Boxes, module: "inventory" },
    { label: "Raw Materials & Costing", href: "/admin/materials", icon: Scale, module: "products" },
    { label: "Delivery Fleet", href: "/admin/delivery", icon: Bike, module: "orders" },
    { label: "Subscriptions", href: "/admin/subscriptions", icon: Calendar, module: "orders" },
    { label: "Returns & Refunds", href: "/admin/returns", icon: RotateCcw, module: "returns" },
  ].filter((item) => canAccess(item.module));

  // Section 2: Growth & Customers
  const customerItems = [
    { label: "Customers CRM", href: "/admin/customers", icon: Users, module: "customers" },
    { label: "Analytics & Reports", href: "/admin/analytics", icon: BarChart3, module: "analytics" },
    { label: "Promo Codes", href: "/admin/promos", icon: TicketPercent, module: "promos" },
    { label: "Enmar Coins", href: "/admin/loyalty", icon: Coins, module: "promos" },
    { label: "Customer Reviews", href: "/admin/reviews", icon: Star, module: "customers" },
    { label: "Recipes & Bundles", href: "/admin/recipes", icon: Utensils, module: "products" },
    { label: "Ads & Promo Banners", href: "/admin/banners", icon: Sparkles, module: "promos" },
  ].filter((item) => canAccess(item.module));

  // Section 3: Store Content & System
  const systemItems = [
    { label: "Site Content & Text", href: "/admin/content", icon: FileText, module: "content" },
    { label: "Site Theme & Setup", href: "/admin/settings", icon: Palette, module: "settings" },
    { label: "Staff & RBAC", href: "/admin/staff", icon: UserCheck, module: "staff", superAdminOnly: true },
    { label: "Notifications & SMS", href: "/admin/notifications", icon: BellRing, module: "notifications" },
    { label: "API Keys & Integrations", href: "/admin/api-access", icon: KeyRound, module: "api" },
    { label: "Catalog API Sync", href: "/admin/api-import", icon: Database, module: "api" },
    { label: "Feature Toggles", href: "/admin/features", icon: Sliders, module: "settings", superAdminOnly: true },
    { label: "Backup & Export", href: "/admin/backup", icon: Database, module: "settings", superAdminOnly: true },
    { label: "Recycle Bin", href: "/admin/bin", icon: Trash2, module: "settings", superAdminOnly: true },
  ].filter((item) => canAccess(item.module, item.superAdminOnly));

  const renderNavGroup = (title: string, items: typeof coreItems) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-0.5">
        <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-white/40 uppercase">
          {title}
        </div>
        <nav className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const currentPath = pathname || "";
            const isActive =
              item.href === "/admin"
                ? currentPath === "/admin"
                : currentPath.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-accent text-forest-deep font-bold shadow-xs"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-forest-deep" : "text-white/70")} />
                  <span className="truncate">{item.label}</span>
                </div>
                {(item as any).badge && (
                  <span className={cn(
                    "px-1 py-0.2 text-[9px] font-bold rounded uppercase",
                    isActive ? "bg-forest-deep text-accent" : "bg-white/20 text-white"
                  )}>
                    {(item as any).badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-60 bg-forest-deep text-white flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 border-r border-white/10 shadow-lg select-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-13 sm:h-14 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-7 h-7 rounded-lg overflow-hidden shadow-xs shrink-0 ring-1 ring-white/20">
              <Image
                src="/assets/logo/logo.png"
                alt="ENMAR Logo"
                fill
                className="object-cover"
                sizes="28px"
              />
            </div>
            <div className="min-w-0">
              <span className="font-display font-bold text-sm tracking-wide text-white block truncate leading-tight">
                ENMAR ADMIN
              </span>
              <span className="block text-[9px] text-white/60 tracking-wider uppercase font-medium">
                Control Hub
              </span>
            </div>
          </Link>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-md text-white/60 hover:text-white lg:hidden cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Navigation Links */}
        <div className="flex-1 overflow-y-auto py-2.5 px-2 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
          {renderNavGroup("Operations", coreItems)}
          {renderNavGroup("Growth & Sales", customerItems)}
          {renderNavGroup("System & Settings", systemItems)}
        </div>

        {/* Compact Footer Profile */}
        <div className="p-2 border-t border-white/10 shrink-0 space-y-1 bg-black/20">
          <div className="px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-forest text-white flex items-center justify-center font-bold text-[10px] border border-white/20 shrink-0 uppercase">
                {currentUser?.name ? currentUser.name.slice(0, 2) : "SA"}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold truncate text-white leading-tight">
                  {currentUser?.name || "Admin"}
                </p>
                <p className="text-[9px] text-white/60 truncate font-mono">
                  {currentUser?.role?.replace("_", " ") || "SUPER ADMIN"}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1 rounded-md text-white/60 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

