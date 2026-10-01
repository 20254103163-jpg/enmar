// prisma/seed.ts
import { PrismaClient, Role, OrderStatus, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting ENMAR Comprehensive Database Seeding in mini...");

  // 1. Superadmin & Staff Users
  const superadminPassword = await bcrypt.hash("Abuhorira97@", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@enmar.bd" },
    update: { role: Role.SUPER_ADMIN },
    create: {
      name: "Abu Hourira (Superadmin)",
      email: "admin@enmar.bd",
      phone: "+8801614113082",
      passwordHash: superadminPassword,
      role: Role.SUPER_ADMIN,
      city: "Dhaka",
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });
  console.log("✅ Superadmin user ready:", adminUser.email);

  // 2. RBAC Permission Matrix Defaults
  const modules = ["products", "orders", "inventory", "promos", "theme", "settings", "gateways", "api", "staff", "returns"];
  for (const mod of modules) {
    await prisma.rolePermission.upsert({
      where: { role_module: { role: Role.SUPER_ADMIN, module: mod } },
      update: { canRead: true, canCreate: true, canEdit: true, canDelete: true },
      create: { role: Role.SUPER_ADMIN, module: mod, canRead: true, canCreate: true, canEdit: true, canDelete: true },
    });

    const isAdminRestricted = mod === "staff" || mod === "gateways";
    await prisma.rolePermission.upsert({
      where: { role_module: { role: Role.ADMIN, module: mod } },
      update: { canRead: true, canCreate: !isAdminRestricted, canEdit: !isAdminRestricted, canDelete: !isAdminRestricted },
      create: { role: Role.ADMIN, module: mod, canRead: true, canCreate: !isAdminRestricted, canEdit: !isAdminRestricted, canDelete: !isAdminRestricted },
    });

    const isManagerAllowed = ["products", "orders", "inventory", "returns"].includes(mod);
    await prisma.rolePermission.upsert({
      where: { role_module: { role: Role.MANAGER, module: mod } },
      update: { canRead: isManagerAllowed, canCreate: isManagerAllowed, canEdit: isManagerAllowed, canDelete: false },
      create: { role: Role.MANAGER, module: mod, canRead: isManagerAllowed, canCreate: isManagerAllowed, canEdit: isManagerAllowed, canDelete: false },
    });

    const isModAllowed = ["products", "promos"].includes(mod);
    await prisma.rolePermission.upsert({
      where: { role_module: { role: Role.MODERATOR, module: mod } },
      update: { canRead: isModAllowed, canCreate: false, canEdit: isModAllowed, canDelete: false },
      create: { role: Role.MODERATOR, module: mod, canRead: isModAllowed, canCreate: false, canEdit: isModAllowed, canDelete: false },
    });
  }

  // 3. All 10 Categories from AGENTS.md
  const categoriesData = [
    { name: "Honey & Sweeteners", slug: "honey-sweeteners", icon: "honey", description: "100% Pure Raw Honey from Sundarbans & mustard flowers" },
    { name: "Oils & Ghee", slug: "oils-ghee", icon: "oil", description: "Cold-pressed mustard oil, virgin coconut oil, pure bilona ghee" },
    { name: "Dates & Dry Fruits", slug: "dates-dry-fruits", icon: "dates", description: "Premium Ajwa, Medjool, and organic dry dates" },
    { name: "Organic Spices", slug: "organic-spices", icon: "spice", description: "Freshly ground turmeric, cumin, chili, and whole spices" },
    { name: "Nuts & Seeds", slug: "nuts-seeds", icon: "nuts", description: "Almonds, cashew nuts, chia seeds, and pumpkin seeds" },
    { name: "Tea & Coffee", slug: "tea-coffee", icon: "tea", description: "Organic Sylhet black tea, green tea, artisanal roasted coffee" },
    { name: "Rice, Flour & Pulses", slug: "rice-flour-pulses", icon: "grain", description: "Nazirshail rice, red rice, organic dal, unbleached flour" },
    { name: "Organic Health & Wellness", slug: "organic-health-wellness", icon: "leaf", description: "Certified black seed oil, moringa powder, spirulina" },
    { name: "Combo & Bundle Deals", slug: "combo-bundle-deals", icon: "bundle", description: "Curated pantry packs with exclusive savings" },
    { name: "Pickles & Preserves", slug: "pickles-preserves", icon: "pickle", description: "Traditional homemade mango, olive, and garlic pickles" },
  ];

  const catMap: Record<string, number> = {};

  for (let i = 0; i < categoriesData.length; i++) {
    const cat = categoriesData[i];
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: { displayOrder: i },
      create: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        displayOrder: i,
        isActive: true,
      },
    });
    catMap[cat.slug] = created.id;
  }
  console.log("✅ 10 Categories synced.");

  // 4. Comprehensive Product Catalog across ALL 10 Categories
  const productsData = [
    // Honey & Sweeteners
    {
      name: "Raw Sundarban Wild Honey (খাঁটি সুন্দরবনের মধু)",
      slug: "raw-sundarban-wild-honey-500g",
      categorySlug: "honey-sweeteners",
      price: 750,
      discountPrice: 680,
      stockQuantity: 50,
      unit: "500g",
      images: ["/assets/products/honey-sundarban.jpg"],
      description: "100% natural, unheated, unpasteurized wild flower honey collected ethically by traditional Mowali honey collectors in the Sundarban mangrove forest.",
      shortDescription: "Pure unfiltered mangrove wild honey with high pollen content.",
      organicCertified: true,
      badge: "Best Seller",
      featured: true,
    },
    {
      name: "Organic Mustard Flower Honey (সরিষা ফুলের মধু)",
      slug: "organic-mustard-flower-honey-500g",
      categorySlug: "honey-sweeteners",
      price: 520,
      discountPrice: 480,
      stockQuantity: 40,
      unit: "500g",
      images: ["/assets/products/honey-mustard.jpg"],
      description: "Light golden raw honey collected directly from organic blooming mustard fields. Naturally creamy with delicate floral sweetness.",
      shortDescription: "Smooth, golden organic mustard flower honey.",
      organicCertified: true,
      badge: "Pure Harvest",
      featured: true,
    },

    // Oils & Ghee
    {
      name: "Pure Desi Cow Ghee (বিলোনা গাওয়া ঘি)",
      slug: "pure-desi-cow-ghee-bilona-400g",
      categorySlug: "oils-ghee",
      price: 950,
      discountPrice: 890,
      stockQuantity: 35,
      unit: "400g",
      images: ["/assets/products/ghee-bilona.jpg"],
      description: "Hand-crafted from cultured milk of grass-fed indigenous cows using traditional wooden bilona churning. Aromatic and granular texture.",
      shortDescription: "Golden granular A2 cow ghee with authentic village aroma.",
      organicCertified: true,
      badge: "Top Rated",
      featured: true,
    },
    {
      name: "Cold-Pressed Wood Ghani Mustard Oil (কাঠের ঘানির সরিষার তেল)",
      slug: "cold-pressed-mustard-oil-1l",
      categorySlug: "oils-ghee",
      price: 360,
      discountPrice: 330,
      stockQuantity: 60,
      unit: "1 Litre",
      images: ["/assets/products/mustard-oil.jpg"],
      description: "Extracted in slow-speed wooden ghani without excessive heat. 100% pure, intense natural pungency and deep golden color.",
      shortDescription: "Unrefined raw mustard oil rich in Omega-3 and natural antioxidants.",
      organicCertified: true,
      badge: "Kitchen Essential",
      featured: true,
    },
    {
      name: "Extra Virgin Organic Coconut Oil (অর্গানিক নারিকেল তেল)",
      slug: "extra-virgin-coconut-oil-500ml",
      categorySlug: "oils-ghee",
      price: 480,
      discountPrice: 440,
      stockQuantity: 30,
      unit: "500ml",
      images: ["/assets/products/coconut-oil.jpg"],
      description: "Cold-processed from fresh coconut milk without chemical additives. Ideal for healthy cooking, keto diet, and skin nourishment.",
      shortDescription: "Centrifuge-extracted pure virgin coconut oil.",
      organicCertified: true,
      badge: "Premium",
      featured: false,
    },

    // Dates & Dry Fruits
    {
      name: "Premium Saudi Ajwa Dates (মদিনার আজওয়া খেজুর)",
      slug: "premium-ajwa-dates-500g",
      categorySlug: "dates-dry-fruits",
      price: 980,
      discountPrice: 900,
      stockQuantity: 40,
      unit: "500g",
      images: ["/assets/products/ajwa-dates.jpg"],
      description: "Authentic Ajwa dates imported directly from Medina orchards. Soft, naturally sweet, and renowned for health benefits.",
      shortDescription: "Directly imported grade-A Medina Ajwa dates.",
      organicCertified: true,
      badge: "Direct Import",
      featured: true,
    },
    {
      name: "Organic Medjool Jumbo Dates (মেডজুল খেজুর)",
      slug: "organic-medjool-dates-500g",
      categorySlug: "dates-dry-fruits",
      price: 850,
      discountPrice: 790,
      stockQuantity: 30,
      unit: "500g",
      images: ["/assets/products/medjool-dates.jpg"],
      description: "Known as the King of Dates, these giant Medjool dates have a rich, caramel-like taste with a tender chewy texture.",
      shortDescription: "Jumbo-sized luscious organic Medjool dates.",
      organicCertified: true,
      badge: "Luxury",
      featured: false,
    },

    // Organic Spices
    {
      name: "Pahari Organic Turmeric Powder (পাহাড়ী অর্গানিক হলুদ গুঁড়া)",
      slug: "organic-turmeric-powder-250g",
      categorySlug: "organic-spices",
      price: 180,
      discountPrice: 160,
      stockQuantity: 80,
      unit: "250g",
      images: ["/assets/products/turmeric-powder.jpg"],
      description: "High-curcumin organic turmeric sourced from Chittagong Hill Tracts. Sun-dried and freshly milled without lead chrome or dyes.",
      shortDescription: "100% lead-free high curcumin turmeric powder.",
      organicCertified: true,
      badge: "Pure Farm",
      featured: true,
    },
    {
      name: "Special Whole Garam Masala (স্পেশাল আস্ত গরম মসলা)",
      slug: "special-whole-garam-masala-100g",
      categorySlug: "organic-spices",
      price: 290,
      discountPrice: 260,
      stockQuantity: 45,
      unit: "100g",
      images: ["/assets/products/garam-masala.jpg"],
      description: "A royal blend of green cardamom, cinnamon quills, cloves, star anise, mace, and nutmeg for festive culinary perfection.",
      shortDescription: "Authentic aromatic whole spice blend.",
      organicCertified: true,
      badge: "Aromatic",
      featured: false,
    },

    // Nuts & Seeds
    {
      name: "Raw Organic Chia Seeds (অর্গানিক চিয়া সিড)",
      slug: "organic-chia-seeds-250g",
      categorySlug: "nuts-seeds",
      price: 320,
      discountPrice: 280,
      stockQuantity: 70,
      unit: "250g",
      images: ["/assets/products/chia-seeds.jpg"],
      description: "Superfood rich in dietary fiber, protein, and Omega-3 fatty acids. Perfect for weight management smoothies and puddings.",
      shortDescription: "High-purity whole black chia seeds.",
      organicCertified: true,
      badge: "Superfood",
      featured: true,
    },
    {
      name: "California Roasted Almonds (আমন্ড বাদাম)",
      slug: "california-almonds-400g",
      categorySlug: "nuts-seeds",
      price: 650,
      discountPrice: 590,
      stockQuantity: 35,
      unit: "400g",
      images: ["/assets/products/almonds.jpg"],
      description: "Crunchy, hand-selected California almonds packed with vitamin E and healthy fats.",
      shortDescription: "Crispy premium whole almonds.",
      organicCertified: true,
      badge: "Healthy Snack",
      featured: false,
    },

    // Tea & Coffee
    {
      name: "Sylhet First Flush Organic Black Tea (শ্রীমঙ্গলের অর্গানিক চা)",
      slug: "sylhet-organic-black-tea-200g",
      categorySlug: "tea-coffee",
      price: 260,
      discountPrice: 230,
      stockQuantity: 50,
      unit: "200g",
      images: ["/assets/products/black-tea.jpg"],
      description: "Single-estate hand-plucked tea leaves from certified organic tea gardens of Sreemangal. Refreshing aroma and rich liquor.",
      shortDescription: "Single-origin aromatic black tea leaves.",
      organicCertified: true,
      badge: "Estate Pick",
      featured: true,
    },

    // Rice, Flour & Pulses
    {
      name: "Organic Red Rice / Lal Balam Chal (অর্গানিক লাল চাল)",
      slug: "organic-red-rice-2kg",
      categorySlug: "rice-flour-pulses",
      price: 240,
      discountPrice: 220,
      stockQuantity: 60,
      unit: "2kg",
      images: ["/assets/products/red-rice.jpg"],
      description: "Unpolished indigenous red rice with intact bran layer. Low glycemic index and rich in mineral nutrients.",
      shortDescription: "Nutritious unpolished whole grain red rice.",
      organicCertified: true,
      badge: "Low GI",
      featured: false,
    },

    // Organic Health & Wellness
    {
      name: "Pure Cold-Pressed Black Seed Oil (খাঁটি কালোজিরার তেল)",
      slug: "pure-black-seed-oil-100ml",
      categorySlug: "organic-health-wellness",
      price: 280,
      discountPrice: 250,
      stockQuantity: 90,
      unit: "100ml",
      images: ["/assets/products/black-seed-oil.jpg"],
      description: "Cold-pressed from premium Nigella Sativa seeds. Rich in Thymoquinone to bolster immunity and overall vitality.",
      shortDescription: "100% pure cold-pressed Kalojira oil for immunity.",
      organicCertified: true,
      badge: "Immunity Booster",
      featured: true,
    },
    {
      name: "Organic Moringa Leaf Powder (সজনে পাতার গুঁড়া)",
      slug: "organic-moringa-powder-150g",
      categorySlug: "organic-health-wellness",
      price: 320,
      discountPrice: 290,
      stockQuantity: 40,
      unit: "150g",
      images: ["/assets/products/moringa-powder.jpg"],
      description: "Shade-dried tender moringa leaves powdered at low temperatures to lock in multivitamin and mineral content.",
      shortDescription: "Miracle tree superfood powder for daily vitality.",
      organicCertified: true,
      badge: "Superfood",
      featured: false,
    },

    // Pickles & Preserves
    {
      name: "Traditional Mustard Garlic Pickle (ঘানি তেলে রসুনের আচার)",
      slug: "mustard-garlic-pickle-400g",
      categorySlug: "pickles-preserves",
      price: 340,
      discountPrice: 310,
      stockQuantity: 45,
      unit: "400g",
      images: ["/assets/products/garlic-pickle.jpg"],
      description: "Prepared with desi garlic cloves cured naturally in cold-pressed mustard oil and sun-roasted spices without chemical preservatives.",
      shortDescription: "Traditional home-style garlic pickle in mustard oil.",
      organicCertified: true,
      badge: "Home Style",
      featured: false,
    },

    // Combo & Bundle Deals
    {
      name: "Family Health Booster Pantry Combo (ফ্যামিলি হেলথ বুস্টার কম্বো)",
      slug: "family-health-booster-combo",
      categorySlug: "combo-bundle-deals",
      price: 2350,
      discountPrice: 1980,
      stockQuantity: 25,
      unit: "4-in-1 Combo Pack",
      images: ["/assets/products/combo-health.jpg"],
      description: "The ultimate wellness bundle: Sundarban Raw Honey (500g) + Bilona Cow Ghee (400g) + Ghani Mustard Oil (1L) + Black Seed Oil (100ml). Save ৳370!",
      shortDescription: "Complete organic pantry pack for healthy households.",
      organicCertified: true,
      isCombo: true,
      badge: "Save ৳370",
      featured: true,
    },
    {
      name: "Daily Organic Essentials Bundle (দৈনন্দিন অর্গানিক প্যাক)",
      slug: "daily-organic-essentials-pack",
      categorySlug: "combo-bundle-deals",
      price: 1100,
      discountPrice: 940,
      stockQuantity: 30,
      unit: "Essential 3-in-1",
      images: ["/assets/products/combo-essentials.jpg"],
      description: "Includes Ghani Mustard Oil (1L) + Red Rice (2kg) + Pahari Turmeric Powder (250g). Natural purity for everyday meals.",
      shortDescription: "Daily kitchen essentials combo at discounted price.",
      organicCertified: true,
      isCombo: true,
      badge: "Save ৳160",
      featured: true,
    },
  ];

  for (const prod of productsData) {
    const catId = catMap[prod.categorySlug];
    if (!catId) continue;

    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {
        price: prod.price,
        discountPrice: prod.discountPrice,
        stockQuantity: prod.stockQuantity,
        featured: prod.featured,
        badge: prod.badge,
      },
      create: {
        name: prod.name,
        slug: prod.slug,
        categoryId: catId,
        price: prod.price,
        discountPrice: prod.discountPrice,
        stockQuantity: prod.stockQuantity,
        unit: prod.unit,
        images: prod.images,
        description: prod.description,
        shortDescription: prod.shortDescription,
        organicCertified: prod.organicCertified,
        isCombo: (prod as any).isCombo || false,
        badge: prod.badge,
        featured: prod.featured,
        isActive: true,
      },
    });
  }

  // 5. Promo Code Defaults
  await prisma.promoCode.upsert({
    where: { code: "ENMAR10" },
    update: { isActive: true },
    create: {
      code: "ENMAR10",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minOrderAmount: 500,
      maxDiscountAmount: 300,
      totalUsageCap: 500,
      isActive: true,
    },
  });

  await prisma.promoCode.upsert({
    where: { code: "EIDMUBARAK" },
    update: { isActive: true },
    create: {
      code: "EIDMUBARAK",
      discountType: "FIXED",
      discountValue: 150,
      minOrderAmount: 1200,
      totalUsageCap: 200,
      isActive: true,
    },
  });

  console.log("🎉 Database Seeding successfully completed in mini!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
