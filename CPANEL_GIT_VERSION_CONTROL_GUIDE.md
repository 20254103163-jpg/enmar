# 🚀 GitHub থেকে cPanel "Git™ Version Control" দিয়ে ওয়েবসাইট লাইভ করার সম্পূর্ণ গাইড

যেহেতু আপনার cPanel-এ **Terminal নেই**, তাই cPanel-এ `next build` কমান্ড রান করা যায় না। কিন্তু আমরা প্রজেক্টের `.gitignore` ও `package.json` এমনভাবে কনফিগার করেছি যাতে **আপনার কম্পিউটারের বিল্ড করা কোড গিটহাবের মাধ্যমে cPanel-এ সরাসরি চলবে**!

---

## 🛠️ সম্পূর্ণ প্রসেস (মাত্র ৪টি ধাপ):

### ধাপ ১: আপনার কম্পিউটার থেকে গিটহাবে পুশ করুন
প্রথমে আপনার কম্পিউটারে প্রজেক্ট বিল্ড করে গিটহাবে পুশ করুন:

```bash
# ১. প্রোডাকশন বিল্ড করুন
npm run build

# ২. গিটহাবে পুশ করুন
git add .
git commit -m "Deploy ENMAR to cPanel with TiDB"
git push origin main
```

---

### ধাপ ২: cPanel-এ Git Repository ক্লোন করুন
1. আপনার cPanel-এ লগইন করুন।
2. সার্চ বারে লিখুন **Git™ Version Control** এবং ওপেন করুন।
3. **Create** বাটনে ক্লিক করুন:
   - **Clone a Repository** অন রাখুন।
   - **Clone URL:** আপনার গিটহাব রিপোজিটরির লিংক দিন (যেমন: `https://github.com/your-username/your-repo.git`)
   - **Repository Path:** যে ফোল্ডারে ওয়েবসাইট রাখতে চান (যেমন: `enmar` অথবা `public_html`)
   - **Repository Name:** `enmar`
4. নিচে **Create** বাটনে ক্লিক করুন। 
   *(গিটহাব থেকে সব কোড ও বিল্ড cPanel-এ ডাউনলোড হয়ে যাবে)*।

---

### ধাপ ৩: cPanel "Setup Node.js App"-এ অ্যাপ কনফিগার করুন
1. cPanel সার্চ বারে লিখুন **Setup Node.js App**।
2. **Create Application**-এ ক্লিক করুন:
   - **Node.js Version:** `20.x` (অথবা `18.x` / `22.x`)
   - **Application Mode:** `Production`
   - **Application Root:** ধাপ ২-এ যে ফোল্ডার নাম দিয়েছেন (যেমন: `enmar`)
   - **Application URL:** আপনার লাইভ ডোমেইন সিলেক্ট করুন (যেমন: `yourdomain.com`)
   - **Application Startup File:** `server.js`
3. **CREATE** বাটনে চাপ দিন।
4. অ্যাপ ক্রিয়েট হওয়ার পর পেজের মাঝামাঝি থাকা **Run NPM Install** বাটনে ক্লিক করুন। 
   *(এটি স্বয়ংক্রিয়ভাবে `node_modules` ইনস্টল করবে এবং লিনাক্স `prisma generate` রান করবে)*।

---

### ধাপ ৪: `.env` ফাইলে TiDB Cloud লিংক দেওয়া ও অ্যাপ স্টার্ট
1. cPanel **File Manager**-এ গিয়ে আপনার অ্যাপ ফোল্ডারে (`enmar`) ঢুকুন।
2. সেখানে থাকা `.env.example` ফাইলটিকে রিনেম করে **`.env`** করুন।
3. `.env` ফাইলে আপনার TiDB Cloud ডাটাবেজ লিংক বসিয়ে Save করুন:

```env
NODE_ENV=production
PORT=3000

# আপনার TiDB Cloud Connection URL
DATABASE_URL="mysql://YOUR_TIDB_USER:YOUR_TIDB_PASSWORD@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/enmar?sslaccept=strict"

# আপনার ডোমেইন URL
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NEXTAUTH_URL="https://yourdomain.com"

# সিকিউরিটি কী
NEXTAUTH_SECRET="enmar_nextauth_secret_key_2026_super_secure"
ENCRYPTION_SECRET="enmar_secure_master_aes_vault_key_2026_bd"
JWT_SECRET="enmar_jwt_secret_key_2026_production"
```

4. এবার cPanel **Setup Node.js App**-এ গিয়ে **RESTART** বাটনে ক্লিক করুন!

🎉 **আপনার ওয়েবসাইট এখন GitHub থেকে cPanel-এ TiDB Database-এর সাথে লাইভ হয়ে গেছে!**

---

## 🔄 পরবর্তীতে কোড আপডেট করার নিয়ম:
ভবিষ্যতে আপনি কোডে কোনো পরিবর্তন করলে:
1. আপনার কম্পিউটারে `npm run build` করে `git push` করবেন।
2. cPanel-এ গিয়ে **Git™ Version Control** > **Manage** > **Pull or Deploy** ট্যাবে গিয়ে **Update from Remote** (Git Pull)-এ চাপ দিবেন।
3. **Setup Node.js App**-এ গিয়ে শুধু **RESTART** বাটনে ক্লিক করবেন!
