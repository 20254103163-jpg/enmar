"use client";
// app/admin/layout.tsx - Secure Admin Layout Guard

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShieldCheck, ShieldAlert, Loader2, Lock } from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import AdminHeader from "@/components/admin/Header";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, isStaff, isLoaded } = useAuth();
  const [permissions, setPermissions] = useState<any[]>([]);
  const [permsLoaded, setPermsLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isAuthenticated || !isStaff) {
      router.replace(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}&error=unauthorized`);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const res = await fetch("/api/admin/staff/permissions");
        const json = await res.json();
        if (json.success) {
          setPermissions(json.permissions || []);
        }
      } catch (e) {
      } finally {
        setPermsLoaded(true);
      }
    };

    fetchPermissions();
    const interval = setInterval(fetchPermissions, 4000);
    return () => clearInterval(interval);
  }, [isLoaded, isAuthenticated, isStaff, pathname, router]);

  const getModuleForPath = (path: string): { module: string; superAdminOnly?: boolean } => {
    if (path.startsWith("/admin/staff") || path.startsWith("/admin/features") || path.startsWith("/admin/backup") || path.startsWith("/admin/bin")) {
      return { module: "staff", superAdminOnly: true };
    }
    if (path.startsWith("/admin/products") || path.startsWith("/admin/categories") || path.startsWith("/admin/recipes") || path.startsWith("/admin/materials")) return { module: "products" };
    if (path.startsWith("/admin/orders") || path.startsWith("/admin/delivery") || path.startsWith("/admin/subscriptions")) return { module: "orders" };
    if (path.startsWith("/admin/returns")) return { module: "returns" };
    if (path.startsWith("/admin/customers") || path.startsWith("/admin/reviews")) return { module: "customers" };
    if (path.startsWith("/admin/analytics")) return { module: "analytics" };
    if (path.startsWith("/admin/inventory")) return { module: "inventory" };
    if (path.startsWith("/admin/promos") || path.startsWith("/admin/banners") || path.startsWith("/admin/loyalty")) return { module: "promos" };
    if (path.startsWith("/admin/content")) return { module: "content" };
    if (path.startsWith("/admin/settings")) return { module: "settings" };
    if (path.startsWith("/admin/notifications")) return { module: "notifications" };
    if (path.startsWith("/admin/api-access") || path.startsWith("/admin/api-import")) return { module: "api" };
    return { module: "dashboard" };
  };

  const isAccessAllowed = () => {
    if (!user?.role) return false;
    if (user.role === "SUPER_ADMIN") return true;

    const { module, superAdminOnly } = getModuleForPath(pathname || "");
    if (superAdminOnly) return false;
    if (module === "dashboard") return true;

    const perm = permissions.find((p) => p.role === user.role && p.module === module);
    if (!perm) {
      return user.role === "ADMIN";
    }
    return Boolean(perm.canRead);
  };

  // Loading state — wait for auth to hydrate from localStorage
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xl max-w-sm w-full text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-14 h-14 rounded-2xl bg-forest/10 text-forest flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-forest" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-display text-stone-900">
              Verifying Security Access
            </h2>
            <p className="text-xs text-stone-500">
              Authenticating Staff & Superadmin credentials...
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2 text-forest text-xs font-semibold">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Secure Vault Connecting</span>
          </div>
        </div>
      </div>
    );
  }

  // Unauthorized
  if (!isAuthenticated || !isStaff) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-red-200 shadow-xl max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-display text-stone-900">
              Access Restricted
            </h2>
            <p className="text-xs text-stone-500">
              You must sign in with an authorized Superadmin or Staff account to view this area.
            </p>
          </div>
          <button
            onClick={() => router.replace(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}`)}
            className="w-full py-2.5 px-4 rounded-xl bg-forest hover:bg-forest-deep text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Go to Admin Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex">
      {/* Sidebar Navigation */}
      <AdminSidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
        <AdminHeader
          onOpenMobile={() => setMobileOpen(true)}
          title="ENMAR Operations Suite"
          subtitle="Real-time Storefront & Order Management"
        />

        <main className="flex-1 p-3 sm:p-4 lg:p-6 max-w-7xl w-full mx-auto">
          {permsLoaded && !isAccessAllowed() ? (
            <div className="py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-card">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold font-display text-ink">
                  অনুমতি সীমাবদ্ধ (Access Restricted)
                </h2>
                <p className="text-xs text-ink-soft leading-relaxed">
                  সুপার এডমিন আপনার রোলের (<strong>{user?.role}</strong>) জন্য এই মডিউলের অ্যাক্সেস বন্ধ রেখেছেন।
                </p>
              </div>
              <button
                onClick={() => router.push("/admin")}
                className="px-6 py-2.5 rounded-xl bg-forest hover:bg-forest-deep text-white text-xs font-bold shadow-premium transition-all cursor-pointer"
              >
                ড্যাশবোর্ডে ফিরে যান
              </button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

