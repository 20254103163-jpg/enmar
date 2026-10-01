# 🚀 TiDB Cloud ডাটাবেজ দিয়ে cPanel-এ ENMAR লাইভ করার সহজ গাইড

TiDB Cloud ব্যবহার করলে আপনার cPanel-এর ৫ জিবি স্টোরেজের কোনো ক্ষতি হবে না এবং ডাটাবেজ অত্যন্ত ফাস্ট, স্কেলেবল ও নিরাপদ থাকবে। এছাড়া cPanel-এ কোনো ডাটাবেজ বানানোর ঝামেলাই থাকবে না!

---

## 🛠️ মাত্র ৩টি সহজ ধাপে TiDB + cPanel সেটআপ:

### ধাপ ১: TiDB Cloud-এ ডাটাবেজ ও স্কিমা রেডি করা
1. আপনার [TiDB Cloud Console](https://tidbcloud.com/)-এ লগইন করুন।
2. আপনার ক্লাস্টারের **Connect** বাটনে ক্লিক করে **Prisma** বা **General MySQL** সিলেক্ট করুন এবং আপনার **Database URL** টি কপি করুন।
   *(উদাহরণ: `mysql://xxxx.root:YourPassword@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/enmar?sslaccept=strict`)*
3. TiDB Cloud-এর **SQL Editor**-এ যান এবং প্রজেক্টের **`main.sql`** ফাইলের সব কোড কপি করে পেস্ট করে **Run** করুন।
   *(অথবা আপনার কম্পিউটার থেকে `DATABASE_URL` পরিবর্তন করে `npm run db:push` দিতে পারেন)*।

---

### ধাপ ২: cPanel "Setup Node.js App" কনফিগারেশন
1. cPanel সার্চ বারে গিয়ে **Setup Node.js App** ওপেন করুন।
2. **Create Application**-এ ক্লিক করুন:
   - **Node.js Version:** `20.x` (বা `18.x` / `22.x`)
   - **Application Mode:** `Production`
   - **Application Root:** `enmar` (বা আপনার পছন্দের ফোল্ডার নাম)
   - **Application URL:** আপনার লাইভ ডোমেইন (যেমন: `yourdomain.com`)
   - **Application Startup File:** `server.js`
3. **CREATE** বাটনে ক্লিক করুন।

---

### ধাপ ৩: ফাইল আপলোড ও `.env` ফাইলে TiDB URL বসানো
1. cPanel **File Manager**-এ গিয়ে আপনার অ্যাপ ফোল্ডারে (`enmar`) প্রবেশ করুন।
2. **`enmar_cpanel_deploy.zip`** ফাইলটি আপলোড করে **Extract** (Unzip) করুন।
3. `.env.example` ফাইলটিকে রিনেম করে **`.env`** করুন এবং এডিট করে আপনার **TiDB Cloud Connection String** বসিয়ে দিন:

```env
NODE_ENV=production
PORT=3000

# TiDB Cloud Connection URL
DATABASE_URL="mysql://YOUR_TIDB_USER:YOUR_TIDB_PASSWORD@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/enmar?sslaccept=strict"

# আপনার ডোমেইন URL
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NEXTAUTH_URL="https://yourdomain.com"

# সিকিউরিটি কী
NEXTAUTH_SECRET="enmar_nextauth_secret_key_2026_super_secure"
ENCRYPTION_SECRET="enmar_secure_master_aes_vault_key_2026_bd"
JWT_SECRET="enmar_jwt_secret_key_2026_production"
```

4. ফাইলটি **Save** করুন।
5. cPanel-এর **Setup Node.js App**-এ গিয়ে অ্যাপের **RESTART** বাটনে ক্লিক করুন!

🎉 **আপনার ওয়েবসাইট এখন TiDB Cloud-এর সাথে কানেক্টেড হয়ে লাইভ হয়ে যাবে!**

---

## 🔐 ডিফল্ট সুপার এডমিন লগইন তথ্য:
- **Admin Login URL:** `https://yourdomain.com/auth/login`
- **Email:** `admin@enmar.bd`
- **Password:** `Admin@123456`
- **Phone:** `01614113082`
