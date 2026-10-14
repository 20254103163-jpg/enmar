// lib/notifications.ts - Full Real-time Multi-Gateway Notification Engine with Nodemailer SMTP

import prisma from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import nodemailer from "nodemailer";

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send SMS notification via configured SMS gateway with fallback logging
 */
export async function sendSMS(
  recipientPhone: string,
  messageText: string,
  subject: string = "ENMAR Notification",
  orderId?: number
): Promise<NotificationResult> {
  try {
    let status = "FAILED";
    let errorMessage = "";

    const gateway = await prisma.notificationGateway.findFirst({
      where: { channel: "SMS", isActive: true },
    });

    if (!gateway) {
      console.log(`[SMS Simulation] To: ${recipientPhone} | Message: ${messageText}`);
      await prisma.notificationLog.create({
        data: {
          channel: "SMS",
          recipient: recipientPhone,
          subject,
          content: messageText,
          status: "SENT",
          errorReason: "Simulation mode (No SMS gateway active)",
        },
      });
      return { success: true, messageId: "SIMULATED-SMS" };
    }

    let creds: any = {};
    if (gateway.credentialsEncrypted) {
      try {
        const decrypted = decrypt(gateway.credentialsEncrypted);
        if (decrypted) creds = JSON.parse(decrypted);
      } catch (e) {
        console.error("Error decrypting SMS credentials:", e);
      }
    }

    const apiKey = creds.apiKey || "";
    const senderId = gateway.senderId || "ENMAR";

    // Standard Bangladeshi SMS API Request (BulkSMSBD / Generic REST)
    const endpoint =
      creds.apiEndpoint ||
      `https://bulksmsbd.net/api/smsapi?api_key=${apiKey}&type=text&number=${recipientPhone}&senderid=${senderId}&message=${encodeURIComponent(messageText)}`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          sender_id: senderId,
          number: recipientPhone,
          message: messageText,
        }),
      });

      status = response.ok ? "SENT" : "FAILED";
      if (!response.ok) {
        const resText = await response.text();
        errorMessage = `HTTP ${response.status}: ${resText}`;
      }
    } catch (apiErr: any) {
      errorMessage = apiErr.message;
      status = "FAILED";
    }

    await prisma.notificationLog.create({
      data: {
        gatewayId: gateway.id,
        channel: "SMS",
        recipient: recipientPhone,
        subject,
        content: messageText,
        status: status === "SENT" ? "SENT" : "FAILED",
        errorReason: errorMessage || null,
      },
    });

    return {
      success: status === "SENT",
      error: errorMessage || undefined,
    };
  } catch (error: any) {
    console.error("[sendSMS Error]:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send Real Email notification via configured SMTP / Gmail Gateway
 */
export async function sendEmail(
  recipientEmail: string,
  subject: string,
  contentHtml: string,
  orderId?: number,
  overrideCredentials?: {
    smtpHost?: string;
    smtpPort?: string | number;
    smtpUser?: string;
    smtpPass?: string;
  }
): Promise<NotificationResult> {
  try {
    const gateway = await prisma.notificationGateway.findFirst({
      where: { channel: "EMAIL", isActive: true },
    });

    let creds: any = {};
    if (gateway?.credentialsEncrypted) {
      try {
        const decrypted = decrypt(gateway.credentialsEncrypted);
        if (decrypted) creds = JSON.parse(decrypted);
      } catch (e) {
        console.error("Error decrypting email credentials:", e);
      }
    }

    const host = (overrideCredentials?.smtpHost || creds.smtpHost || process.env.SMTP_HOST || "smtp.gmail.com").trim();
    const port = Number(overrideCredentials?.smtpPort || creds.smtpPort || process.env.SMTP_PORT) || 587;
    const user = (overrideCredentials?.smtpUser || creds.smtpUser || process.env.GMAIL_USER || process.env.SMTP_USER || "").trim();
    const pass = (overrideCredentials?.smtpPass || creds.smtpPass || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || "").replace(/\s+/g, "").trim();

    if (!user || !pass) {
      console.log(`[Email Warning] No SMTP Configured. To: ${recipientEmail} | Subject: ${subject}`);
      await prisma.notificationLog.create({
        data: {
          channel: "EMAIL",
          recipient: recipientEmail,
          subject,
          content: contentHtml,
          status: "FAILED",
          errorReason: "No Gmail SMTP credentials configured in database or .env",
        },
      });
      return {
        success: false,
        error: "Gmail SMTP গেটওয়ে এখনও কনফিগার করা হয়নি। অ্যাডমিন প্যানেলে (Admin -> Notifications) গিয়ে আপনার Gmail এবং ১৬-সংখ্যার Google App Password সেভ করুন।",
      };
    }

    const isGmail = host.toLowerCase().includes("gmail.com") || user.toLowerCase().endsWith("@gmail.com");
    const isSecure = port === 465;

    // Create Nodemailer Transporter
    const transporter = isGmail
      ? nodemailer.createTransport({
          service: "gmail",
          auth: {
            user,
            pass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        })
      : nodemailer.createTransport({
          host,
          port,
          secure: isSecure,
          auth: {
            user,
            pass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });

    // Send real email
    const senderName = gateway?.senderId || process.env.SMTP_SENDER_NAME || "ENMAR Organic Food";
    const mailOptions = {
      from: `"${senderName}" <${user}>`,
      to: recipientEmail,
      subject,
      html: contentHtml,
    };

    const info = await transporter.sendMail(mailOptions);

    // Record success log in database
    await prisma.notificationLog.create({
      data: {
        gatewayId: gateway?.id || null,
        channel: "EMAIL",
        recipient: recipientEmail,
        subject,
        content: contentHtml,
        status: "SENT",
        errorReason: null,
      },
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[sendEmail Error]:", error);

    // Record failure log in database for admin visibility
    try {
      const gateway = await prisma.notificationGateway.findFirst({
        where: { channel: "EMAIL" },
      });
      await prisma.notificationLog.create({
        data: {
          gatewayId: gateway?.id,
          channel: "EMAIL",
          recipient: recipientEmail,
          subject,
          content: contentHtml,
          status: "FAILED",
          errorReason: error.message || "Failed to send email via SMTP",
        },
      });
    } catch (logErr) {}

    return { success: false, error: error.message };
  }
}

/**
 * Automated Event: Order Placed Notification
 */
export async function notifyOrderPlaced(order: any) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://www.enmar.shop";

  const trackingLink = `${appUrl}/track/${order.trackingId}`;

  // 1. Customer SMS
  const customerMsg = `Dear ${order.customerName}, your order (${order.orderNumber}) of ৳${order.totalAmount} is confirmed! Track live parcel: ${trackingLink}`;
  sendSMS(order.customerPhone, customerMsg, "Order Confirmation", order.id).catch(console.error);

  // 2. Customer Email
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
      <h2 style="color: #14421a; margin-top: 0;">🌱 Order Confirmed!</h2>
      <p style="font-size: 14px; color: #374151;">Dear <strong>${order.customerName}</strong>,</p>
      <p style="font-size: 14px; color: #374151;">Thank you for your order <strong>#${order.orderNumber}</strong>. We are preparing your fresh organic items for delivery.</p>
      
      <div style="background: #fdfbf7; padding: 18px; border-radius: 12px; margin: 20px 0; border: 1px solid #f3eedf;">
        <p style="margin: 4px 0; font-size: 13px;"><strong>Tracking ID:</strong> ${order.trackingId}</p>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Payment Method:</strong> ${order.paymentMethod}</p>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Delivery Address:</strong> ${order.shippingAddress} (${order.deliveryZone || "Standard"})</p>
        <hr style="border: none; border-top: 1px dashed #e5e7eb; margin: 12px 0;" />
        <div style="font-size: 13px; line-height: 1.8;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #4b5563;">Products Subtotal (পণ্যের মূল্য):</span>
            <span style="font-weight: 600; font-family: monospace;">৳${order.subtotal}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #4b5563;">Delivery Charge (ডেলিভারি চার্জ):</span>
            <span style="font-weight: 600; font-family: monospace;">${Number(order.shippingFee) === 0 ? "FREE (৳0)" : `৳${order.shippingFee}`}</span>
          </div>
          ${Number(order.discountAmount) > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #15803d;">
            <span>Discount (${order.promoCodeText || "Coupon"}):</span>
            <span style="font-family: monospace;">-৳${order.discountAmount}</span>
          </div>` : ""}
          ${Number(order.coinsDiscount) > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #b45309;">
            <span>Coins Discount:</span>
            <span style="font-family: monospace;">-৳${order.coinsDiscount}</span>
          </div>` : ""}
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; color: #14421a; border-top: 2px solid #14421a; padding-top: 8px; margin-top: 8px;">
            <span>Total Payable Amount (সর্বমোট বিল):</span>
            <span style="font-family: monospace;">৳${order.totalAmount}</span>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${trackingLink}" style="background: #14421a; color: #ffffff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
          Track Parcel Live
        </a>
      </div>

      <p style="color: #6b7280; font-size: 12px; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 16px; margin-bottom: 0;">
        Have questions? Reply directly to this email or call our hotline.
      </p>
    </div>
  `;
  sendEmail(order.customerEmail, `Order Received #${order.orderNumber}`, emailHtml, order.id).catch(console.error);

  // 3. Admin Alert SMS
  const adminMsg = `[ALERT] New Order received! No: ${order.orderNumber}, Amount: ৳${order.totalAmount}, Customer: ${order.customerName} (${order.customerPhone}).`;
  const adminPhone = process.env.ADMIN_ALERT_PHONE || "01614113082";
  sendSMS(adminPhone, adminMsg, "Admin New Order Alert", order.id).catch(console.error);
}

/**
 * Automated Event: Order Status Changed Notification
 */
export async function notifyOrderStatusChanged(
  order: any,
  newStatus: string,
  note?: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.enmar.shop";
  const trackingLink = `${appUrl}/track/${order.trackingId}`;

  let statusText = newStatus;
  if (newStatus === "CONFIRMED") statusText = "Verified & Confirmed";
  if (newStatus === "PACKED") statusText = "Freshly Packed at Warehouse";
  if (newStatus === "SHIPPED") statusText = `Handed over to ${order.courierPartner || "Courier"} Logistics`;
  if (newStatus === "OUT_FOR_DELIVERY") statusText = "Out for Delivery with Rider";
  if (newStatus === "DELIVERED") statusText = "Delivered Successfully";
  if (newStatus === "CANCELLED") statusText = "Cancelled";

  const customerMsg = newStatus === "CANCELLED"
    ? `Order #${order.orderNumber} Cancelled. ${note || ""}. Tracking: ${trackingLink}`
    : `Order #${order.orderNumber} Update: Your parcel status is now [${statusText}]. Track: ${trackingLink}`;

  if (newStatus === "CANCELLED") {
    const cancelEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
        <h2 style="color: #dc2626; margin-top: 0;">Order Cancelled</h2>
        <p style="font-size: 14px; color: #374151;">Dear <strong>${order.customerName}</strong>,</p>
        <p style="font-size: 14px; color: #374151;">Your order <strong>#${order.orderNumber}</strong> has been cancelled.</p>
        <div style="background: #fef2f2; padding: 16px; border-radius: 12px; margin: 20px 0; border: 1px solid #fee2e2;">
          <p style="margin: 4px 0; font-size: 13px;"><strong>Tracking ID:</strong> ${order.trackingId}</p>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Cancellation Reason:</strong> ${note || order.cancellationReason || "Cancelled by admin/customer"}</p>
        </div>
        <p><a href="${trackingLink}" style="background: #14421a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">View Tracking Details</a></p>
      </div>
    `;
    sendEmail(order.customerEmail, `Order #${order.orderNumber} Cancelled`, cancelEmailHtml, order.id).catch(console.error);
  }

  sendSMS(order.customerPhone, customerMsg, "Order Status Update", order.id).catch(console.error);
}
