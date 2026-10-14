// app/note/page.tsx - Fast Social Media (Messenger & WhatsApp) Order Hub & Smart Chat Parser
"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  MessageCircle,
  Copy,
  Check,
  Send,
  Plus,
  Trash2,
  Package,
  Truck,
  Phone,
  User,
  MapPin,
  Lock,
  LogOut,
  RefreshCw,
  ExternalLink,
  Receipt,
  Search,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  FileText,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { formatTaka, getSafeImageUrl, formatBengaliNumber } from "@/lib/utils";

interface ProductItem {
  id: number;
  name: string;
  price: number;
  discountPrice?: number | null;
  stockQuantity: number;
  unit: string;
  images: any;
}

interface OrderItemInput {
  productId: number | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  itemImage?: string;
}

export default function NoteOrderHubPage() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // App State
  const [activeTab, setActiveTab] = useState<"parser" | "manual" | "recent">("parser");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Chat Parser State
  const [rawChatText, setRawChatText] = useState("");
  const [parseSuccessMsg, setParseSuccessMsg] = useState("");

  // Order Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [deliveryZone, setDeliveryZone] = useState<"Inside Dhaka" | "Outside Dhaka">("Inside Dhaka");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "BKASH" | "NAGAD" | "ROCKET">("COD");
  const [shippingFee, setShippingFee] = useState<number>(60);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [orderItems, setOrderItems] = useState<OrderItemInput[]>([]);
  const [notes, setNotes] = useState("");

  // Search product dropdown in manual builder
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedQty, setSelectedQty] = useState<number>(1);

  // Creation & Result State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderResult, setCreatedOrderResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedMessenger, setCopiedMessenger] = useState(false);

  // Recent Orders State
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // 1. Check existing Auth
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setAuthChecking(true);
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user && ["SUPER_ADMIN", "ADMIN", "MANAGER", "MODERATOR"].includes(data.user.role)) {
        setIsAuthenticated(true);
        loadProducts();
        loadRecentOrders();
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      setIsAuthenticated(false);
    } finally {
      setAuthChecking(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "লগইন ব্যর্থ হয়েছে। সঠিক ইমেইল ও পাসওয়ার্ড দিন।");
      }
      if (!["SUPER_ADMIN", "ADMIN", "MANAGER", "MODERATOR"].includes(data.user?.role)) {
        throw new Error("এই পেজটিতে শুধুমাত্র স্টোর অ্যাডমিন ও স্টাফদের অ্যাক্সেস রয়েছে।");
      }
      setIsAuthenticated(true);
      loadProducts();
      loadRecentOrders();
    } catch (err: any) {
      setAuthError(err.message || "লগইন করতে সমস্যা হয়েছে।");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsAuthenticated(false);
    } catch (e) {}
  };

  // 2. Load Products Catalog for Matching
  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProducts(false);
    }
  };

  // 3. Load Recent Social Orders
  const loadRecentOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      if (data.orders) {
        setRecentOrders(data.orders.slice(0, 15));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // 4. Update Shipping fee when zone changes
  useEffect(() => {
    if (deliveryZone === "Inside Dhaka") {
      setShippingFee(60);
    } else {
      setShippingFee(120);
    }
  }, [deliveryZone]);

  // 5. Intelligent NLP & Regex Parser
  const parseChatText = () => {
    if (!rawChatText.trim()) return;

    setParseSuccessMsg("");
    const text = rawChatText;
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    let parsedName = "";
    let parsedPhone = "";
    let parsedAddress = "";
    let detectedZone: "Inside Dhaka" | "Outside Dhaka" = "Inside Dhaka";
    const matchedItems: OrderItemInput[] = [];

    // A. Extract Bangladeshi Phone Number
    // Matches 013, 014, 015, 016, 017, 018, 019
    const phoneMatch = text.match(/(?:\+?880|0)?1[3-9]\d{8}/);
    if (phoneMatch) {
      let rawP = phoneMatch[0].replace(/\D/g, "");
      if (rawP.startsWith("8801")) rawP = "0" + rawP.slice(2);
      parsedPhone = rawP;
    }

    // B. Extract Customer Name
    const nameLine = lines.find((l) =>
      /^(?:নাম|Name|গ্রাহক|Customer)\s*[:=-]\s*(.+)/i.test(l)
    );
    if (nameLine) {
      const match = nameLine.match(/^(?:নাম|Name|গ্রাহক|Customer)\s*[:=-]\s*(.+)/i);
      if (match && match[1]) parsedName = match[1].trim();
    } else {
      // If line 1 has no digits and is not an address keyword, assume it's name
      if (lines[0] && !/\d/.test(lines[0]) && !/ঠিকানা|address|ঢাকা|road|রোড/i.test(lines[0])) {
        parsedName = lines[0].replace(/^(?:আমি|Mr\.|Md\.|নাম)\s*/i, "").trim();
      }
    }

    // C. Extract Address
    const addressLines: string[] = [];
    let addressFound = false;

    for (const line of lines) {
      if (/^(?:ঠিকানা|Address|লোকেশন|Location|বাসা|ডেলিভারি ঠিকানা)\s*[:=-]\s*(.+)/i.test(line)) {
        const match = line.match(/^(?:ঠিকানা|Address|লোকেশন|Location|বাসা|ডেলিভারি ঠিকানা)\s*[:=-]\s*(.+)/i);
        if (match && match[1]) addressLines.push(match[1].trim());
        addressFound = true;
      } else if (
        addressFound &&
        !/^(?:পণ্য|Product|ফোন|Phone|মোবাইল|Mobile|টাকা|মূল্য)/i.test(line) &&
        !line.includes(parsedPhone)
      ) {
        addressLines.push(line);
      } else if (
        !addressFound &&
        /(?:রোড|road|বাড়ি|house|ফ্ল্যাট|flat|মিরপুর|ধানমন্ডি|উত্তরা|গুলশান|বনানী|মোহাম্মদপুর|চট্টগ্রাম|সিলেট|রাজশাহী|খুলনা|বরিশাল|রংপুর|গাজীপুর|নারায়ণগঞ্জ|থানা|জেলা|পোস্ট)/i.test(
          line
        ) &&
        !line.includes(parsedPhone) &&
        line !== nameLine
      ) {
        addressLines.push(line);
      }
    }

    if (addressLines.length > 0) {
      parsedAddress = addressLines.join(", ");
    }

    // D. Detect Delivery Zone (Inside vs Outside Dhaka)
    const combinedAddressText = (parsedAddress + " " + text).toLowerCase();
    const dhakaKeywords = [
      "ঢাকা",
      "dhaka",
      "মিরপুর",
      "mirpur",
      "ধানমন্ডি",
      "dhanmondi",
      "উত্তরা",
      "uttara",
      "গুলশান",
      "gulshan",
      "বনানী",
      "banani",
      "মোহাম্মদপুর",
      "mohammadpur",
      "মতিঝিল",
      "motijheel",
      "বাড্ডা",
      "badda",
      "খিলগাঁও",
      "khilgaon",
      "যাত্রাবাড়ী",
      "jatrabari",
      "শ্যামলী",
      "shyamoli",
    ];

    const outsideKeywords = [
      "চট্টগ্রাম",
      "chittagong",
      "ctg",
      "সিলেট",
      "sylhet",
      "রাজশাহী",
      "rajshahi",
      "খুলনা",
      "khulna",
      "বরিশাল",
      "barisal",
      "রংপুর",
      "rangpur",
      "ময়মনসিংহ",
      "mymensingh",
      "কুমিল্লা",
      "comilla",
      "বগুড়া",
      "bogura",
      "যশোর",
      "jashore",
      "কক্সবাজার",
      "cox's bazar",
      "ফরিদপুর",
      "নোয়াখালী",
    ];

    if (outsideKeywords.some((k) => combinedAddressText.includes(k))) {
      detectedZone = "Outside Dhaka";
    } else if (dhakaKeywords.some((k) => combinedAddressText.includes(k))) {
      detectedZone = "Inside Dhaka";
    }

    // E. Match Products from Store Inventory
    if (products.length > 0) {
      products.forEach((p) => {
        const pNameLower = p.name.toLowerCase();
        // Extract key words from product name
        const keywords = pNameLower
          .split(/[\s,()\-+]+/)
          .filter((w) => w.length >= 3 && !["প্যাক", "গ্রাম", "কেজি", "লিটার", "combo", "organic"].includes(w));

        const isMatch = keywords.some((kw) => text.toLowerCase().includes(kw));

        if (isMatch) {
          // Try finding quantity in text (e.g. "২ কেজি", "2 kg", "১ টা", "3 piece", "500g")
          let qty = 1;
          const qtyRegex = new RegExp(`(?:(\\d+)\\s*(?:টি|টা|kg|কেজি|লিটার|L|পিস|piece|বক্স|box)|(?:১|২|৩|৪|৫)\\s*(?:টি|টা|কেজি|লিটার))`, "i");
          const qMatch = text.match(qtyRegex);
          if (qMatch) {
            const numStr = qMatch[1] || qMatch[0];
            const bengaliToEng: Record<string, string> = { "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5" };
            const parsedDigit = bengaliToEng[numStr] || numStr.replace(/\D/g, "");
            if (parsedDigit && !isNaN(Number(parsedDigit))) {
              qty = Math.max(1, parseInt(parsedDigit, 10));
            }
          }

          let img = "/assets/logo/logo.png";
          if (Array.isArray(p.images) && p.images[0]) {
            img = getSafeImageUrl(p.images[0]);
          }

          matchedItems.push({
            productId: p.id,
            productName: p.name,
            unitPrice: Number(p.discountPrice || p.price),
            quantity: qty,
            unit: p.unit || "piece",
            itemImage: img,
          });
        }
      });
    }

    // Apply Parsed Values
    if (parsedName) setCustomerName(parsedName);
    if (parsedPhone) setCustomerPhone(parsedPhone);
    if (parsedAddress) setShippingAddress(parsedAddress);
    setDeliveryZone(detectedZone);

    if (matchedItems.length > 0) {
      // Deduplicate matched items by productId
      const uniqueMap = new Map<number, OrderItemInput>();
      matchedItems.forEach((it) => {
        if (it.productId && !uniqueMap.has(it.productId)) {
          uniqueMap.set(it.productId, it);
        }
      });
      setOrderItems(Array.from(uniqueMap.values()));
      setParseSuccessMsg(
        `✨ সফলভাবে নাম, মোবাইল, ঠিকানা এবং ${uniqueMap.size}টি পণ্য স্বয়ংক্রিয়ভাবে পার্স করা হয়েছে!`
      );
    } else {
      setParseSuccessMsg("✨ কাস্টমারের তথ্য পার্স করা হয়েছে! অনুগ্রহ করে নিচের তালিকা থেকে পণ্য যোগ করুন।");
    }
  };

  // Add Item Manually
  const handleAddManualItem = () => {
    if (!selectedProductId) return;
    const p = products.find((prod) => prod.id === Number(selectedProductId));
    if (!p) return;

    const existingIdx = orderItems.findIndex((it) => it.productId === p.id);
    if (existingIdx > -1) {
      const updated = [...orderItems];
      updated[existingIdx].quantity += selectedQty;
      setOrderItems(updated);
    } else {
      let img = "/assets/logo/logo.png";
      if (Array.isArray(p.images) && p.images[0]) {
        img = getSafeImageUrl(p.images[0]);
      }
      setOrderItems([
        ...orderItems,
        {
          productId: p.id,
          productName: p.name,
          unitPrice: Number(p.discountPrice || p.price),
          quantity: selectedQty,
          unit: p.unit || "piece",
          itemImage: img,
        },
      ]);
    }

    setSelectedProductId("");
    setSelectedQty(1);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = [...orderItems];
    updated[index].quantity = newQty;
    setOrderItems(updated);
  };

  // Calculations
  const calculatedSubtotal = useMemo(() => {
    return orderItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  }, [orderItems]);

  const calculatedTotal = useMemo(() => {
    return Math.max(0, calculatedSubtotal + Number(shippingFee || 0) - Number(discountAmount || 0));
  }, [calculatedSubtotal, shippingFee, discountAmount]);

  // Submit & Create Order
  const handleSubmitOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim()) {
      setErrorMessage("অনুগ্রহ করে কাস্টমারের নাম, ফোন নম্বর এবং সম্পূর্ণ ডেলিভারি ঠিকানা দিন।");
      return;
    }

    if (orderItems.length === 0) {
      setErrorMessage("কমপক্ষে ১টি পণ্য কার্টে যোগ করুন।");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/admin/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          shippingAddress,
          deliveryZone,
          paymentMethod,
          shippingFee,
          discountAmount,
          customerNotes: notes || "Order created via Messenger/WhatsApp Note Hub",
          items: orderItems,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "অর্ডার তৈরি করতে ব্যর্থ হয়েছে।");
      }

      setCreatedOrderResult(data);
      loadRecentOrders();

      // Reset form
      setRawChatText("");
      setCustomerName("");
      setCustomerPhone("");
      setShippingAddress("");
      setOrderItems([]);
      setNotes("");
      setDiscountAmount(0);
    } catch (err: any) {
      setErrorMessage(err.message || "অর্ডারটি সংরক্ষণ করতে সমস্যা হয়েছে।");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessenger(true);
    setTimeout(() => setCopiedMessenger(false), 2500);
  };

  // -------------------------------------------------------------
  // RENDER: Auth Gateway if not authenticated
  // -------------------------------------------------------------
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#1c1917] text-stone-200 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-sm font-medium text-stone-400">সিকিউরিটি যাচাই করা হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-[#1c1917] to-stone-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-stone-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-amber-400">
              ENMAR Secret Note & Order Hub
            </h1>
            <p className="text-xs sm:text-sm text-stone-400">
              মেসেঞ্জার ও হোয়াটসঅ্যাপের অর্ডার ১-ক্লিকে সংরক্ষণ ও পরিচালনা করতে অ্যাডমিন লগইন করুন।
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300">অ্যাডমিন ইমেইল / ইউজারনেম</label>
              <input
                type="text"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@enmar.bd"
                className="w-full px-4 py-3 rounded-xl bg-stone-800/80 border border-stone-700 text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 transition-colors text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300">অ্যাডমিন পাসওয়ার্ড</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-stone-800/80 border border-stone-700 text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 transition-colors text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 active:to-amber-700 text-stone-950 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {authLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>যাচাই করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>লগইন করুন ও নোট হাব খুলুন</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <Link href="/" className="text-xs text-stone-500 hover:text-stone-300 transition-colors">
              ← মূল ওয়েবসাইটে ফিরে যান
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Main Protected Note & Social Order Workspace
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0f0e0d] text-stone-100 flex flex-col justify-between selection:bg-amber-500 selection:text-black">
      {/* Top App Header */}
      <header className="sticky top-0 z-30 bg-[#161514]/90 backdrop-blur-md border-b border-stone-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-600 p-0.5 flex items-center justify-center shadow-md shadow-amber-500/10">
            <div className="w-full h-full bg-[#161514] rounded-[10px] flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold font-display text-amber-400">
                ENMAR Social Order Hub
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                /note
              </span>
            </div>
            <p className="text-[11px] text-stone-400">মেসেঞ্জার ও হোয়াটসঅ্যাপ চ্যাট থেকে তাৎক্ষণিক অর্ডার</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/admin"
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <span>অ্যাডমিন প্যানেল</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleLogout}
            title="লগ আউট"
            className="p-2 rounded-lg bg-stone-800/80 hover:bg-red-950/60 hover:text-red-400 text-stone-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1 bg-stone-900/80 border border-stone-800 rounded-2xl max-w-md mx-auto sm:mx-0">
          <button
            onClick={() => setActiveTab("parser")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "parser"
                ? "bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>⚡ Smart Chat Parser</span>
          </button>

          <button
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "manual"
                ? "bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>📝 ম্যানুয়াল ফর্ম</span>
          </button>

          <button
            onClick={() => setActiveTab("recent")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "recent"
                ? "bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>📋 অর্ডারসমূহ ({recentOrders.length})</span>
          </button>
        </div>

        {/* -------------------------------------------------------------
            SUCCESS NOTIFICATION CARD WITH WHATSAPP LINK & MESSENGER COPY
        ------------------------------------------------------------- */}
        {createdOrderResult && (
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-950/80 via-stone-900 to-emerald-900/40 border-2 border-emerald-500/60 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-emerald-300 font-display">
                    🎉 অর্ডারটি সফলভাবে তৈরি ও সংরক্ষিত হয়েছে!
                  </h3>
                  <p className="text-xs text-stone-300">
                    অর্ডার নম্বর: <span className="font-mono font-bold text-white">#{createdOrderResult.order?.orderNumber}</span> | ট্র্যাকিং আইডি: <span className="font-mono font-bold text-amber-400">{createdOrderResult.order?.trackingId}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  স্ট্যাটাস: CONFIRMED
                </span>
              </div>
            </div>

            {/* Quick Action Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {/* WhatsApp Button */}
              <a
                href={createdOrderResult.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1da850] text-stone-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-stone-950 text-stone-950" />
                <span>📲 হোয়াটসঅ্যাপে রসিদ পাঠান</span>
              </a>

              {/* Copy for Messenger */}
              <button
                onClick={() => copyToClipboard(createdOrderResult.messengerText)}
                className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copiedMessenger ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>✓ কপি করা হয়েছে!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>📋 মেসেঞ্জারের জন্য কপি করুন</span>
                  </>
                )}
              </button>

              {/* View Live Tracking */}
              <a
                href={createdOrderResult.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-800 text-stone-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border border-stone-700"
              >
                <ExternalLink className="w-4 h-4 text-amber-400" />
                <span>🌐 লাইভ ট্র্যাকিং পেজ</span>
              </a>

              {/* Print Official Invoice */}
              {createdOrderResult.order?.id && (
                <Link
                  href={`/admin/orders/${createdOrderResult.order.id}/invoice`}
                  target="_blank"
                  className="py-3 px-4 rounded-xl bg-forest hover:bg-forest-deep text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Receipt className="w-4 h-4" />
                  <span>🖨️ ইনভয়েস প্রিন্ট</span>
                </Link>
              )}

              {/* Close / Dismiss */}
              <button
                onClick={() => setCreatedOrderResult(null)}
                className="py-3 px-4 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white text-xs font-semibold transition-all"
              >
                ✕ নোটিফিকেশন বন্ধ করুন
              </button>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 1: SMART CHAT PARSER & ORDER FORM
        ------------------------------------------------------------- */}
        {activeTab === "parser" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Side: Raw Chat Box (5 cols) */}
            <div className="lg:col-span-5 bg-stone-900/80 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>মেসেঞ্জার / হোয়াটসঅ্যাপ চ্যাট পেস্ট করুন</span>
                </div>
                <span className="text-[11px] text-stone-500 font-mono">বাংলা / English</span>
              </div>

              <textarea
                rows={9}
                value={rawChatText}
                onChange={(e) => setRawChatText(e.target.value)}
                placeholder={`কাস্টমারের মেসেজ এখানে পেস্ট করুন, যেমন:\n\nনাম: রফিকুল ইসলাম\nমোবাইল: 01712345678\nঠিকানা: বাসা ১২, রোড ৪, সেক্টর ৭, উত্তরা, ঢাকা\nপণ্য: ১ কেজি সুন্দরবনের মধু + ১ লিটার সরিষার তেল`}
                className="w-full p-4 rounded-2xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-sans text-xs sm:text-sm leading-relaxed resize-y transition-colors"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={parseChatText}
                  disabled={!rawChatText.trim()}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 text-stone-950 shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>✨ অটো-পার্স ও ফিল্ড পূরণ করুন</span>
                </button>

                {rawChatText && (
                  <button
                    type="button"
                    onClick={() => setRawChatText("")}
                    className="p-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {parseSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{parseSuccessMsg}</span>
                </div>
              )}

              {/* Tips */}
              <div className="p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800/80 text-[11px] text-stone-400 space-y-1">
                <strong className="text-amber-400/90 block">💡 পার্সারের টিপস:</strong>
                <p>• কাস্টমারের ফোন নম্বর (01X...), নাম ও ঠিকানা টেক্সট থেকে নিজে নিজেই আলাদা করে নেবে।</p>
                <p>• ঠিকানা ঢাকা হলে ডেলিভারি ৬০৳ এবং ঢাকার বাইরে হলে ১২০৳ স্বয়ংক্রিয়ভাবে নির্ধারণ হবে।</p>
              </div>
            </div>

            {/* Right Side: Parsed Details & Product Builder (7 cols) */}
            <div className="lg:col-span-7 bg-stone-900/80 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <h2 className="text-sm sm:text-base font-bold text-stone-200 flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-400" />
                  <span>অর্ডার ও কাস্টমার তথ্য যাচাই</span>
                </h2>
                <span className="text-xs text-stone-400">প্রয়োজনে এডিট করুন</span>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Customer Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>কাস্টমারের নাম *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>মোবাইল নম্বর *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="যেমন: 01712345678"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>সম্পূর্ণ ডেলিভারি ঠিকানা *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="বাসা নম্বর, রোড, এলাকা/থানা, জেলা"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                {/* Delivery Zone & Payment Method */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-amber-400" />
                    <span>ডেলিভারি এরিয়া</span>
                  </label>
                  <select
                    value={deliveryZone}
                    onChange={(e) => setDeliveryZone(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
                  >
                    <option value="Inside Dhaka">ঢাকার ভিতরে (৬০ ৳)</option>
                    <option value="Outside Dhaka">ঢাকার বাইরে (১২০ ৳)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-amber-400" />
                    <span>পেমেন্ট মেথড</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
                  >
                    <option value="COD">Cash on Delivery (ক্যাশ অন ডেলিভারি)</option>
                    <option value="BKASH">bKash (বিকাশ)</option>
                    <option value="NAGAD">Nagad (নগদ)</option>
                    <option value="ROCKET">Rocket (রকেট)</option>
                  </select>
                </div>
              </div>

              {/* Product Selection / Cart Items */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-t border-stone-800 pt-3">
                  <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4" />
                    <span>অর্ডারকৃত পণ্যসমূহ ({orderItems.length})</span>
                  </label>
                </div>

                {/* Add Product Dropdown */}
                <div className="flex flex-col sm:flex-row gap-2 bg-stone-950 p-2.5 rounded-2xl border border-stone-800">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="">পণ্য নির্বাচন করুন...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatTaka(p.discountPrice || p.price)} (স্টক: {p.stockQuantity})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-16 px-2.5 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs text-center font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualItem}
                      disabled={!selectedProductId}
                      className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>যোগ করুন</span>
                    </button>
                  </div>
                </div>

                {/* Selected Item List */}
                {orderItems.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-stone-950/40 border border-dashed border-stone-800 text-center text-xs text-stone-500">
                    কোনো পণ্য যোগ করা হয়নি। উপরের ড্রপডাউন থেকে পণ্য সিলেক্ট করুন অথবা চ্যাট পার্স করুন।
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {orderItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-stone-950 border border-stone-800/80 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-stone-800 relative shrink-0">
                            <Image
                              src={item.itemImage || "/assets/logo/logo.png"}
                              alt={item.productName}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="truncate">
                            <strong className="block text-stone-200 truncate">{item.productName}</strong>
                            <span className="text-[11px] text-stone-400 font-mono">
                              {formatTaka(item.unitPrice)} × {item.quantity} {item.unit} ={" "}
                              <span className="text-amber-400 font-bold">{formatTaka(item.unitPrice * item.quantity)}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, item.quantity - 1)}
                            className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-mono font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, item.quantity + 1)}
                            className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 rounded text-stone-500 hover:text-red-400 hover:bg-red-950/40 ml-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Price Calculation & Checkout Bar */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span>সাবটোটাল:</span>
                  <span className="font-mono text-stone-200 font-semibold">{formatTaka(calculatedSubtotal)}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-400 gap-2 border-y border-stone-800/60 py-2">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold text-stone-300">ডেলিভারি চার্জ:</span>
                    <span className="text-[10px] text-stone-500">(ইচ্ছামতো পরিবর্তনযোগ্য)</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1">
                      {[0, 50, 60, 70, 80, 100, 120, 150].map((fee) => (
                        <button
                          key={fee}
                          type="button"
                          onClick={() => setShippingFee(fee)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                            shippingFee === fee
                              ? "bg-amber-500 text-stone-950 font-bold"
                              : "bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800"
                          }`}
                        >
                          {fee === 0 ? "ফ্রি (০)" : `৳${fee}`}
                        </button>
                      ))}
                    </div>

                    {/* Custom Input */}
                    <div className="flex items-center gap-1 bg-stone-900 px-2 py-0.5 rounded-md border border-stone-700">
                      <span className="text-[11px] text-stone-400">৳</span>
                      <input
                        type="number"
                        min={0}
                        value={shippingFee}
                        onChange={(e) => setShippingFee(Math.max(0, Number(e.target.value) || 0))}
                        className="w-14 bg-transparent text-white text-xs text-right font-mono font-bold focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span>বিশেষ ছাড় / ডিসকাউন্ট:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-stone-500">- ৳</span>
                    <input
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                      className="w-16 px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-amber-400 text-xs text-right font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="border-t border-stone-800 pt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">সর্বমোট বিল (Total):</span>
                  <span className="text-base sm:text-lg font-bold font-mono text-amber-400">
                    {formatTaka(calculatedTotal)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={isSubmitting || orderItems.length === 0}
                className="w-full py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:from-emerald-600 text-stone-950 shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>অর্ডার ডাটাবেজে সংরক্ষণ করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Package className="w-5 h-5" />
                    <span>🚀 অর্ডার সেভ করুন ও ট্র্যাকিং কোড তৈরি করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 2: MANUAL FORM (Clean Simple View)
        ------------------------------------------------------------- */}
        {activeTab === "manual" && (
          <div className="max-w-3xl mx-auto bg-stone-900/80 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="border-b border-stone-800 pb-4">
              <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2 font-display">
                <Plus className="w-5 h-5" />
                <span>ম্যানুয়াল সোশ্যাল অর্ডার ফর্ম</span>
              </h2>
              <p className="text-xs text-stone-400">কাস্টমারের তথ্য দিয়ে সরাসরি ডাটাবেজে নতুন অর্ডার এন্ট্রি করুন।</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">কাস্টমারের নাম *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="নাম লিখুন"
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">মোবাইল নম্বর *</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white text-sm font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">সম্পূর্ণ ঠিকানা *</label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="রোড, বাড়ি, থানা, জেলা"
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">ডেলিভারি এরিয়া</label>
                  <select
                    value={deliveryZone}
                    onChange={(e) => setDeliveryZone(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="Inside Dhaka">ঢাকার ভিতরে (৬০ ৳)</option>
                    <option value="Outside Dhaka">ঢাকার বাইরে (১২০ ৳)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">পেমেন্ট মেথড</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="COD">Cash on Delivery</option>
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                  </select>
                </div>
              </div>

              {/* Product selector in manual view */}
              <div className="pt-2 space-y-3">
                <label className="text-xs font-bold text-amber-400 block">পণ্য যুক্ত করুন:</label>
                <div className="flex gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white text-sm"
                  >
                    <option value="">পণ্য নির্বাচন করুন...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatTaka(p.discountPrice || p.price)} (স্টক: {p.stockQuantity})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddManualItem}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
                  >
                    যুক্ত করুন
                  </button>
                </div>

                {orderItems.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between text-xs">
                    <span>{item.productName} ({item.quantity} {item.unit})</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-amber-400 font-bold">{formatTaka(item.unitPrice * item.quantity)}</span>
                      <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery Fee & Discount Selector */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-400 gap-2">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold text-stone-300">ডেলিভারি চার্জ:</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      {[0, 50, 60, 70, 80, 100, 120, 150].map((fee) => (
                        <button
                          key={fee}
                          type="button"
                          onClick={() => setShippingFee(fee)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                            shippingFee === fee
                              ? "bg-amber-500 text-stone-950 font-bold"
                              : "bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800"
                          }`}
                        >
                          {fee === 0 ? "ফ্রি (০)" : `৳${fee}`}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 bg-stone-900 px-2 py-0.5 rounded-md border border-stone-700">
                      <span className="text-[11px] text-stone-400">৳</span>
                      <input
                        type="number"
                        min={0}
                        value={shippingFee}
                        onChange={(e) => setShippingFee(Math.max(0, Number(e.target.value) || 0))}
                        className="w-14 bg-transparent text-white text-xs text-right font-mono font-bold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-400 border-t border-stone-800/60 pt-2">
                  <span>বিশেষ ছাড় / ডিসকাউন্ট (টাকা):</span>
                  <div className="flex items-center gap-1 bg-stone-900 px-2 py-0.5 rounded-md border border-stone-700">
                    <span className="text-[11px] text-stone-400">- ৳</span>
                    <input
                      type="number"
                      min={0}
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                      className="w-14 bg-transparent text-amber-400 text-xs text-right font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Total & Place Order */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-400 block">সর্বমোট প্রদেয় বিল:</span>
                  <strong className="text-lg font-mono text-amber-400">{formatTaka(calculatedTotal)}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting || orderItems.length === 0}
                  className="py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-sm"
                >
                  {isSubmitting ? "সংরক্ষণ হচ্ছে..." : "অর্ডার সেভ করুন"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 3: RECENT ORDERS LIST WITH WHATSAPP BUTTONS
        ------------------------------------------------------------- */}
        {activeTab === "recent" && (
          <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-stone-100 flex items-center gap-2 font-display">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>সাম্প্রতিক সোশ্যাল ও ম্যানুয়াল অর্ডারসমূহ</span>
                </h2>
                <p className="text-xs text-stone-400">মেসেঞ্জার ও হোয়াটসঅ্যাপে ট্র্যাকিং মেসেজ পাঠানোর অপশন সহ</p>
              </div>

              <button
                onClick={loadRecentOrders}
                disabled={loadingOrders}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? "animate-spin text-amber-400" : ""}`} />
                <span>রিফ্রেশ</span>
              </button>
            </div>

            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-xs">
                কোনো সাম্প্রতিক অর্ডার পাওয়া যায়নি।
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((ord) => {
                  const cleanPhone = ord.customerPhone?.replace(/\D/g, "") || "";
                  const waNumber = cleanPhone.startsWith("0") ? "88" + cleanPhone : cleanPhone;
                  const origin = typeof window !== "undefined" ? window.location.origin : "https://enmar.com.bd";
                  const trackingUrl = `${origin}/track/${ord.trackingId}`;
                  const waMsg = `আসসালামু আলাইকুম ${ord.customerName}! 🌿\nENMAR-এ আপনার অর্ডার (#${ord.orderNumber}) প্রস্তুত করা হচ্ছে।\nডেলিভারি ঠিকানা: ${ord.shippingAddress}\n\n💵 পণ্যের মূল্য: ৳${ord.subtotal}\n🚚 ডেলিভারি চার্জ: ৳${ord.shippingFee}\n💰 সর্বমোট বিল: ৳${ord.totalAmount}\n\nআপনার পার্সেলটি লাইভ ট্র্যাক করতে ভিজিট করুন: ${trackingUrl}`;
                  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`;

                  return (
                    <div
                      key={ord.id}
                      className="p-4 rounded-2xl bg-stone-950 border border-stone-800/80 hover:border-stone-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-sm">#{ord.orderNumber}</span>
                          <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 font-mono text-[10px]">
                            {ord.trackingId}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                            {ord.orderStatus}
                          </span>
                        </div>
                        <p className="text-stone-300 font-semibold">
                          {ord.customerName} ({ord.customerPhone})
                        </p>
                        <p className="text-stone-400 text-[11px] truncate max-w-md">{ord.shippingAddress}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right mr-2 hidden sm:block">
                          <span className="text-[11px] text-stone-400 block">মোট বিল</span>
                          <strong className="text-sm font-mono text-amber-400">{formatTaka(ord.totalAmount)}</strong>
                        </div>

                        {/* Invoice Print Link */}
                        <Link
                          href={`/admin/orders/${ord.id}/invoice`}
                          target="_blank"
                          className="py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                          title="ইনভয়েস প্রিন্ট"
                        >
                          <Receipt className="w-3.5 h-3.5 text-amber-400" />
                          <span>ইনভয়েস</span>
                        </Link>

                        {/* WhatsApp Receipt Button */}
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-stone-950" />
                          <span>WhatsApp</span>
                        </a>

                        {/* Copy Messenger Button */}
                        <button
                          onClick={() => copyToClipboard(waMsg)}
                          className="py-2 px-3 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>কপি</span>
                        </button>

                        {/* Track Order */}
                        <Link
                          href={`/track-order?id=${ord.trackingId}`}
                          target="_blank"
                          className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                          title="ট্র্যাক পেজ"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-900 bg-[#121110] px-4 py-3 text-center text-[11px] text-stone-500">
        ENMAR Social Media Order Assistant • Confidential Admin Tool • Route: <span className="font-mono text-amber-400/80">/note</span>
      </footer>
    </div>
  );
}
