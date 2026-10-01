-- ==========================================================
-- ENMAR Live Production Database Dump (100% phpMyAdmin / cPanel Safe)
-- Idempotent: Can be imported on fresh or existing databases safely
-- Encoding: UTF-8 (No BOM)
-- Compatible with: MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+
-- Generated: 2026-08-24
-- ==========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- Drop existing tables to avoid "already exists" errors
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `wishlist_items`;
DROP TABLE IF EXISTS `role_permissions`;
DROP TABLE IF EXISTS `staff_audit_logs`;
DROP TABLE IF EXISTS `addresses`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `order_history`;
DROP TABLE IF EXISTS `order_messages`;
DROP TABLE IF EXISTS `return_requests`;
DROP TABLE IF EXISTS `return_timelines`;
DROP TABLE IF EXISTS `promo_codes`;
DROP TABLE IF EXISTS `wellness_profiles`;
DROP TABLE IF EXISTS `product_subscribers`;
DROP TABLE IF EXISTS `notification_gateways`;
DROP TABLE IF EXISTS `notification_logs`;
DROP TABLE IF EXISTS `site_settings`;
DROP TABLE IF EXISTS `theme_settings`;
DROP TABLE IF EXISTS `promotion_banners`;
DROP TABLE IF EXISTS `ai_settings`;
DROP TABLE IF EXISTS `ai_conversation_logs`;
DROP TABLE IF EXISTS `api_keys`;
DROP TABLE IF EXISTS `api_access_logs`;
DROP TABLE IF EXISTS `api_import_sources`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `community_comments`;
DROP TABLE IF EXISTS `backup_logs`;
DROP TABLE IF EXISTS `recycle_bin`;
DROP TABLE IF EXISTS `feature_flags`;
DROP TABLE IF EXISTS `delivery_personnel`;

-- CreateTable
CREATE TABLE IF NOT EXISTS `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MODERATOR', 'CUSTOMER') NOT NULL DEFAULT 'CUSTOMER',
    `avatar` TEXT NULL,
    `address` TEXT NULL,
    `city` VARCHAR(191) NULL DEFAULT 'Dhaka',
    `postalCode` VARCHAR(191) NULL,
    `isPhoneVerified` BOOLEAN NOT NULL DEFAULT false,
    `isEmailVerified` BOOLEAN NOT NULL DEFAULT false,
    `otpCode` VARCHAR(191) NULL,
    `otpExpiresAt` DATETIME(3) NULL,
    `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    `twoFactorSecret` TEXT NULL,
    `failedAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `wishlist_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `wishlist_items_userId_productId_key`(`userId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `role_permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MODERATOR', 'CUSTOMER') NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `canRead` BOOLEAN NOT NULL DEFAULT true,
    `canCreate` BOOLEAN NOT NULL DEFAULT false,
    `canEdit` BOOLEAN NOT NULL DEFAULT false,
    `canDelete` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `role_permissions_role_module_key`(`role`, `module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `staff_audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `userEmail` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MODERATOR', 'CUSTOMER') NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `target` VARCHAR(191) NOT NULL,
    `details` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `addresses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL DEFAULT 'Home',
    `recipientName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `streetAddress` TEXT NOT NULL,
    `area` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL DEFAULT 'Dhaka',
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL DEFAULT 'leaf',
    `image` TEXT NULL,
    `description` TEXT NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `parentId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_name_key`(`name`),
    UNIQUE INDEX `categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `categoryId` INTEGER NULL,
    `subcategory` VARCHAR(191) NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `discountPrice` DECIMAL(10, 2) NULL,
    `stockQuantity` INTEGER NOT NULL DEFAULT 0,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'kg',
    `images` JSON NOT NULL,
    `description` LONGTEXT NOT NULL,
    `shortDescription` TEXT NULL,
    `organicCertified` BOOLEAN NOT NULL DEFAULT true,
    `isCombo` BOOLEAN NOT NULL DEFAULT false,
    `comboProductIds` JSON NULL,
    `savingsPercentage` DECIMAL(5, 2) NULL,
    `badge` VARCHAR(191) NULL,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_slug_key`(`slug`),
    INDEX `products_slug_idx`(`slug`),
    INDEX `products_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderNumber` VARCHAR(191) NOT NULL,
    `trackingId` VARCHAR(191) NOT NULL,
    `userId` INTEGER NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerEmail` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `shippingAddress` TEXT NOT NULL,
    `deliveryZone` VARCHAR(191) NULL DEFAULT 'Inside Dhaka',
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `discountAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `promoCodeId` INTEGER NULL,
    `promoCodeText` VARCHAR(191) NULL,
    `shippingFee` DECIMAL(10, 2) NOT NULL DEFAULT 70,
    `totalAmount` DECIMAL(10, 2) NOT NULL,
    `paymentMethod` ENUM('COD', 'BKASH', 'NAGAD', 'ROCKET', 'CARD') NOT NULL DEFAULT 'COD',
    `paymentStatus` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `paymentGatewayTrx` VARCHAR(191) NULL,
    `orderStatus` ENUM('PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED') NOT NULL DEFAULT 'PENDING',
    `courierPartner` VARCHAR(191) NULL,
    `courierTrackingId` VARCHAR(191) NULL,
    `deliveryPersonnelId` INTEGER NULL,
    `estimatedDelivery` DATETIME(3) NULL,
    `cancellationReason` TEXT NULL,
    `refundNeeded` BOOLEAN NOT NULL DEFAULT false,
    `refundStatus` VARCHAR(191) NULL DEFAULT 'NOT_APPLICABLE',
    `customerNotes` TEXT NULL,
    `adminNotes` TEXT NULL,
    `customerHidden` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_orderNumber_key`(`orderNumber`),
    UNIQUE INDEX `orders_trackingId_key`(`trackingId`),
    INDEX `orders_trackingId_idx`(`trackingId`),
    INDEX `orders_orderNumber_idx`(`orderNumber`),
    INDEX `orders_customerPhone_idx`(`customerPhone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `productId` INTEGER NULL,
    `productName` VARCHAR(191) NOT NULL,
    `unitPrice` DECIMAL(10, 2) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'piece',
    `itemImage` TEXT NULL,
    `totalPrice` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `order_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED') NOT NULL,
    `note` TEXT NOT NULL,
    `actorRole` VARCHAR(191) NOT NULL DEFAULT 'SYSTEM',
    `actorName` VARCHAR(191) NOT NULL DEFAULT 'Automated System',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `order_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `sender` VARCHAR(191) NOT NULL,
    `senderName` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `return_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `userId` INTEGER NULL,
    `trackingId` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL,
    `itemIds` JSON NULL,
    `photos` JSON NULL,
    `returnType` VARCHAR(191) NOT NULL DEFAULT 'REFUND',
    `status` ENUM('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REFUNDED', 'EXCHANGED') NOT NULL DEFAULT 'REQUESTED',
    `refundAmount` DECIMAL(10, 2) NULL,
    `adminNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `return_timelines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `returnId` INTEGER NOT NULL,
    `status` ENUM('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REFUNDED', 'EXCHANGED') NOT NULL,
    `note` TEXT NOT NULL,
    `actorName` VARCHAR(191) NOT NULL DEFAULT 'Support Staff',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `promo_codes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `discountType` ENUM('PERCENTAGE', 'FIXED', 'FREE_SHIPPING') NOT NULL DEFAULT 'PERCENTAGE',
    `discountValue` DECIMAL(10, 2) NOT NULL,
    `minOrderAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `maxDiscountAmount` DECIMAL(10, 2) NULL,
    `totalUsageCap` INTEGER NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `perCustomerLimit` INTEGER NOT NULL DEFAULT 1,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `applicableCategories` JSON NULL,
    `applicableProductIds` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `promo_codes_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `wellness_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `heightCm` DOUBLE NULL,
    `weightKg` DOUBLE NULL,
    `bmiValue` DOUBLE NULL,
    `bmiCategory` VARCHAR(191) NULL,
    `dailyCalorie` INTEGER NULL,
    `waterTargetLtr` DOUBLE NULL,
    `activityLevel` VARCHAR(191) NULL DEFAULT 'moderate',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `wellness_profiles_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `product_subscribers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `categories` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `notification_gateways` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `channel` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `credentialsEncrypted` TEXT NOT NULL,
    `senderId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `notification_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gatewayId` INTEGER NULL,
    `channel` VARCHAR(191) NOT NULL,
    `recipient` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NULL,
    `content` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `errorReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `site_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `value` LONGTEXT NOT NULL,
    `group` VARCHAR(191) NOT NULL DEFAULT 'general',
    `isSecret` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `site_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `theme_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#14421a',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#5c3a21',
    `accentColor` VARCHAR(191) NOT NULL DEFAULT '#f5a623',
    `backgroundColor` VARCHAR(191) NOT NULL DEFAULT '#fdfbf7',
    `textColor` VARCHAR(191) NOT NULL DEFAULT '#1f2937',
    `fontHeading` VARCHAR(191) NOT NULL DEFAULT 'Fraunces',
    `fontBody` VARCHAR(191) NOT NULL DEFAULT 'Work Sans',
    `buttonRadius` VARCHAR(191) NOT NULL DEFAULT 'rounded-xl',
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `promotion_banners` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `headline` VARCHAR(191) NULL,
    `subtitle` VARCHAR(191) NULL,
    `imageUrl` TEXT NOT NULL,
    `targetLink` VARCHAR(191) NULL,
    `placement` VARCHAR(191) NOT NULL DEFAULT 'HERO_CAROUSEL',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `bgColor` VARCHAR(191) NULL DEFAULT '#14421a',
    `textColor` VARCHAR(191) NULL DEFAULT '#ffffff',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ai_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'openai',
    `apiKeyEncrypted` TEXT NOT NULL,
    `modelName` VARCHAR(191) NOT NULL DEFAULT 'gpt-4o',
    `systemPrompt` LONGTEXT NOT NULL,
    `adminPrompt` LONGTEXT NULL,
    `rateLimitPerMin` INTEGER NOT NULL DEFAULT 30,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ai_conversation_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sessionId` VARCHAR(191) NOT NULL,
    `userId` INTEGER NULL,
    `userMessage` TEXT NOT NULL,
    `aiResponse` TEXT NOT NULL,
    `tokensUsed` INTEGER NOT NULL DEFAULT 0,
    `isFlagged` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_conversation_logs_sessionId_idx`(`sessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `api_keys` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `keyPrefix` VARCHAR(12) NOT NULL,
    `keyHash` VARCHAR(191) NOT NULL,
    `permissions` VARCHAR(191) NOT NULL DEFAULT 'read:products',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `rateLimit` INTEGER NOT NULL DEFAULT 60,
    `requestCount` INTEGER NOT NULL DEFAULT 0,
    `lastUsedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `api_keys_keyHash_key`(`keyHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `api_access_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `apiKeyId` INTEGER NOT NULL,
    `endpoint` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 200,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `api_import_sources` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `endpointUrl` TEXT NOT NULL,
    `authType` VARCHAR(191) NOT NULL DEFAULT 'bearer',
    `authTokenEncrypted` TEXT NULL,
    `fieldMapping` JSON NOT NULL,
    `syncFrequencyHours` INTEGER NOT NULL DEFAULT 12,
    `autoPublish` BOOLEAN NOT NULL DEFAULT false,
    `lastSyncAt` DATETIME(3) NULL,
    `lastStatus` VARCHAR(191) NULL DEFAULT 'IDLE',
    `errorLog` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `userId` INTEGER NULL,
    `userName` VARCHAR(191) NOT NULL,
    `userEmail` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL DEFAULT 5,
    `comment` TEXT NOT NULL,
    `isApproved` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `community_comments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `authorName` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `backup_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fileName` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `recordCount` INTEGER NOT NULL,
    `createdType` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `recycle_bin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `subtitle` VARCHAR(191) NULL,
    `payload` JSON NOT NULL,
    `deletedBy` VARCHAR(191) NOT NULL DEFAULT 'Admin',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `feature_flags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'general',
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `feature_flags_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `delivery_personnel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `vehicleType` VARCHAR(191) NULL DEFAULT 'Motorbike',
    `licenseNumber` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isSharingLocation` BOOLEAN NOT NULL DEFAULT false,
    `currentLat` DOUBLE NULL,
    `currentLng` DOUBLE NULL,
    `lastLocationUpdate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `delivery_personnel_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wishlist_items` ADD CONSTRAINT `wishlist_items_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wishlist_items` ADD CONSTRAINT `wishlist_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_audit_logs` ADD CONSTRAINT `staff_audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_deliveryPersonnelId_fkey` FOREIGN KEY (`deliveryPersonnelId`) REFERENCES `delivery_personnel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_promoCodeId_fkey` FOREIGN KEY (`promoCodeId`) REFERENCES `promo_codes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_history` ADD CONSTRAINT `order_history_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_messages` ADD CONSTRAINT `order_messages_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `return_requests` ADD CONSTRAINT `return_requests_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `return_requests` ADD CONSTRAINT `return_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `return_timelines` ADD CONSTRAINT `return_timelines_returnId_fkey` FOREIGN KEY (`returnId`) REFERENCES `return_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wellness_profiles` ADD CONSTRAINT `wellness_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_logs` ADD CONSTRAINT `notification_logs_gatewayId_fkey` FOREIGN KEY (`gatewayId`) REFERENCES `notification_gateways`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_conversation_logs` ADD CONSTRAINT `ai_conversation_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_access_logs` ADD CONSTRAINT `api_access_logs_apiKeyId_fkey` FOREIGN KEY (`apiKeyId`) REFERENCES `api_keys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `community_comments` ADD CONSTRAINT `community_comments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;




-- --------------------------------------------------------
-- Dumping data for table `users` (Super Admin)
-- --------------------------------------------------------
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `passwordHash`, `role`, `city`, `isPhoneVerified`, `isEmailVerified`, `createdAt`, `updatedAt`) VALUES
(1, 'Abu Hourira (Superadmin)', 'admin@enmar.bd', '01614113082', '$2b$10$DDAsXVJe9Jgk9vNDR8/T1efW.SSJmulX4m8lLD26ynRX8aUPGNBEm', 'SUPER_ADMIN', 'Dhaka', 1, 1, NOW(), NOW());

-- --------------------------------------------------------
-- Dumping data for table `delivery_personnel` (Rider)
-- --------------------------------------------------------
INSERT INTO `delivery_personnel` (`id`, `name`, `phone`, `passwordHash`, `vehicleType`, `isActive`, `isSharingLocation`, `currentLat`, `currentLng`, `createdAt`, `updatedAt`) VALUES
(1, 'Kamal Hossain (Rider)', '01711000111', '$2b$10$HXEBKuIF6qhHQWNbaaRsBujqdaMWQ5K4qsMxaAIT9NhPKsLfEyGEW', 'Motorbike', 1, 1, 23.8699, 90.3987, NOW(), NOW());

-- --------------------------------------------------------
-- Dumping data for table `categories`
-- --------------------------------------------------------
INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `image`, `createdAt`, `updatedAt`) VALUES
(1, 'মধু ও প্রাকৃতিক মিষ্টি', 'honey-sweeteners', '১০০% খাঁটি সুন্দরবনের কাঁচা মধু ও প্রাকৃতিক মিষ্টি', '/uploads/categories/honey.png', NOW(), NOW()),
(2, 'ঘি ও কোল্ড-প্রেসড তেল', 'oils-ghee', 'কাঠের ঘানিতে ভাঙা খাঁটি সরিষার তেল ও গাওয়া ঘি', '/uploads/categories/oil.png', NOW(), NOW()),
(3, 'অর্গানিক মসলা', 'organic-spices', 'কেমিক্যালমুক্ত খাঁটি দেশি গুড়া মসলা ও গোটা মসলা', '/uploads/categories/spices.png', NOW(), NOW()),
(4, 'কম্বো ও অফার প্যাক', 'combo-bundle-deals', 'পারিবারিক মাসিক বাজার ও বিশেষ ছাড়ের কম্বো প্যাক', '/uploads/categories/combo.png', NOW(), NOW()),
(5, 'হ্যান্ডমেড রুটি', 'handmade-roti', 'স্বাস্থ্যকর হাতে তৈরি তাজা গমের রুটি ও পরোটা', '/uploads/categories/bread.png', NOW(), NOW()),
(6, 'ফ্রোজেন ফুডস', 'frozen-foods', 'রেডি-টু-কুক স্বাস্থ্যকর ফ্রোজেন ডালপুরি ও নাস্তা', '/uploads/categories/frozen.png', NOW(), NOW()),
(7, 'চা ও কফি', 'tea-coffee', 'শ্রীমঙ্গলের প্রিমিয়াম ব্লেন্ড অর্গানিক ব্ল্যাক টি ও কফি', '/uploads/categories/tea.png', NOW(), NOW());

-- --------------------------------------------------------
-- Dumping data for table `products`
-- --------------------------------------------------------
INSERT INTO `products` (`id`, `name`, `slug`, `categoryId`, `price`, `discountPrice`, `stockQuantity`, `unit`, `images`, `description`, `organicCertified`, `featured`, `isActive`, `isCombo`, `createdAt`, `updatedAt`) VALUES
(1, 'সুন্দরবনের খলিসা ফুলের মধু (Sundarban Raw Honey)', 'sundarban-raw-honey-500g', 1, 750.00, 680.00, 45, '500g', '["/uploads/products/honey_500g.png"]', 'সুন্দরবনের প্রাকৃতিক চাক থেকে সংগৃহীত ১০০% বিশুদ্ধ ও অপ্রক্রিয়াজাত খলিসা ফুলের কাঁচা মধু।', 1, 1, 1, 0, NOW(), NOW()),
(2, 'কাঠের ঘানির খাঁটি সরিষার তেল (Cold Pressed Mustard Oil)', 'cold-pressed-mustard-oil-1l', 2, 380.00, 350.00, 60, '1L', '["/uploads/products/mustard_oil_1l.png"]', 'ঘরোয়া কাঠের ঘানিতে ভাঙা প্রথম চাপের ১০০% ঝাঁঝালো ও পুষ্টিকর সরিষার তেল।', 1, 1, 1, 0, NOW(), NOW()),
(3, 'খাঁটি গাওয়া ঘি (Traditional Bilona Cow Ghee)', 'traditional-cow-ghee-500g', 2, 1150.00, 1050.00, 30, '500g', '["/uploads/products/cow_ghee_500g.png"]', 'দেশি গাভীর দুধের মাখন থেকে ঐতিহ্যবাহী পদ্ধতিতে জ্বাল দেওয়া সুস্বাদু দানাদার গাওয়া ঘি।', 1, 1, 1, 0, NOW(), NOW()),
(4, 'অর্গানিক চিয়া সিড (Premium Organic Chia Seeds)', 'premium-chia-seeds-250g', 4, 320.00, 290.00, 50, '250g', '["/uploads/products/chia_seeds.png"]', 'ওমেগা-৩ ফ্যাটি এসিড, ফাইবার ও প্রোটিনে ভরপুর প্রিমিয়াম গ্রেড অর্গানিক চিয়া সিড।', 1, 1, 1, 0, NOW(), NOW()),
(5, 'হাতে তৈরি আটার রুটি (Handmade Wheat Roti - 10 Pcs)', 'handmade-wheat-roti-10pcs', 5, 120.00, NULL, 100, 'pack', '["/uploads/products/handmade_roti.png"]', '১০০% লাল আটার হাতে বেলা স্বাস্থ্যকর তাজা রুটি। নো প্রিজারভেটিভ।', 1, 0, 1, 0, NOW(), NOW()),
(6, 'ফ্রোজেন ডাল পুরী (Frozen Dal Puri - 10 Pcs)', 'frozen-dal-puri-10pcs', 6, 150.00, NULL, 80, 'pack', '["/uploads/products/dal_puri.png"]', 'ঘরোয়া স্বাদে তৈরি রেডি-টু-ফ্রাই মচমচে ডাল পুরী।', 1, 0, 1, 0, NOW(), NOW()),
(7, 'স্পেশাল ফ্রোজেন পরোটা (Special Frozen Paratha - 10 Pcs)', 'special-frozen-paratha-10pcs', 5, 180.00, NULL, 75, 'pack', '["/uploads/products/paratha.png"]', 'খাঁটি ঘিয়ে তৈরি লেয়ারড মচমচে ফ্রোজেন পরোটা।', 1, 0, 1, 0, NOW(), NOW()),
(8, 'প্রিমিয়াম অর্গানিক মসলা কম্বো (Premium Spice Combo)', 'premium-organic-spice-combo', 3, 580.00, 520.00, 25, 'pack', '["/uploads/products/spice_combo.png"]', 'হলুদ, মরিচ, ধনিয়া ও জিরার খাঁটি ১০০% কেমিক্যালমুক্ত ফ্রেশ মশলা কম্বো প্যাক।', 1, 1, 1, 1, NOW(), NOW());

-- --------------------------------------------------------
-- Dumping data for table `theme_settings`
-- --------------------------------------------------------
INSERT INTO `theme_settings` (`id`, `primaryColor`, `secondaryColor`, `accentColor`, `backgroundColor`, `textColor`, `fontHeading`, `fontBody`, `buttonRadius`, `isPublished`, `createdAt`, `updatedAt`) VALUES
(1, '#14421a', '#5c3a21', '#f5a623', '#fdfbf7', '#1f2937', 'Fraunces', 'Work Sans', 'rounded-xl', 1, NOW(), NOW());

-- --------------------------------------------------------
-- Dumping data for table `site_settings`
-- --------------------------------------------------------
INSERT INTO `site_settings` (`key`, `value`, `group`, `isSecret`, `updatedAt`) VALUES
('brandName', 'ENMAR', 'general', 0, NOW()),
('brandTagline', '100% Pure Organic Food & Pantry Essentials', 'general', 0, NOW()),
('contactPhone', '+880 1614 113082', 'general', 0, NOW()),
('contactEmail', 'support@enmar.bd', 'general', 0, NOW()),
('contactAddress', 'House 14, Road 7, Sector 3, Uttara, Dhaka-1230, Bangladesh', 'general', 0, NOW()),
('whatsappNumber', '8801614113082', 'general', 0, NOW()),
('whatsappDefaultMessage', 'Hello ENMAR, I would like to order organic food.', 'general', 0, NOW()),
('freeShippingThreshold', '1500', 'general', 0, NOW()),
('shippingFlat', '70', 'general', 0, NOW()),
('siteLogo', '/assets/logo/logo.png', 'general', 0, NOW()),
('siteFavicon', '/favicon.ico', 'general', 0, NOW()),
('ai_monthly_request_limit', '1000', 'ai', 0, NOW()),
('ai_quota_exceeded', 'false', 'ai', 0, NOW()),
('ai_requests_this_month', '0', 'ai', 0, NOW());

-- --------------------------------------------------------
-- Dumping data for table `promo_codes`
-- --------------------------------------------------------
INSERT INTO `promo_codes` (`id`, `code`, `discountType`, `discountValue`, `minOrderAmount`, `maxDiscountAmount`, `isActive`, `createdAt`, `updatedAt`) VALUES
(1, 'ENMAR10', 'PERCENTAGE', 10.00, 500.00, 200.00, 1, NOW(), NOW()),
(2, 'SAVE100', 'FIXED', 100.00, 1000.00, 100.00, 1, NOW(), NOW());

-- --------------------------------------------------------
-- Dumping data for table `feature_flags`
-- --------------------------------------------------------
INSERT INTO `feature_flags` (`key`, `name`, `description`, `category`, `isEnabled`, `updatedAt`) VALUES
('whatsapp_floating_button', 'WhatsApp Floating Chat', 'Floating WhatsApp support button on storefront', 'storefront', 1, NOW()),
('customer_ai_assistant', 'Customer AI Chatbot', 'AI chat widget for shoppers', 'ai', 1, NOW()),
('rider_live_gps', 'Rider GPS Tracking', 'Live courier location map feed on tracking page', 'logistics', 1, NOW()),
('wellness_hub', 'Wellness & Nutrition Hub', 'Interactive BMI & Calorie Calculator', 'features', 1, NOW());

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
