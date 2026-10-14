exports.id=9729,exports.ids=[9729],exports.modules={52477:(a,b,c)=>{"use strict";c.d(b,{G1:()=>j,YP:()=>g,ZM:()=>h,d4:()=>i});var d=c(70373),e=c(58912),f=c(52731);async function g(a,b,c="ENMAR Notification",f){try{let f="FAILED",g="",h=await d.A.notificationGateway.findFirst({where:{channel:"SMS",isActive:!0}});if(!h)return await d.A.notificationLog.create({data:{channel:"SMS",recipient:a,subject:c,content:b,status:"SENT",errorReason:"Simulation mode (No SMS gateway active)"}}),{success:!0,messageId:"SIMULATED-SMS"};let i={};if(h.credentialsEncrypted)try{let a=(0,e.Yc)(h.credentialsEncrypted);a&&(i=JSON.parse(a))}catch(a){console.error("Error decrypting SMS credentials:",a)}let j=i.apiKey||"",k=h.senderId||"ENMAR",l=i.apiEndpoint||`https://bulksmsbd.net/api/smsapi?api_key=${j}&type=text&number=${a}&senderid=${k}&message=${encodeURIComponent(b)}`;try{let c=await fetch(l,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({api_key:j,sender_id:k,number:a,message:b})});if(f=c.ok?"SENT":"FAILED",!c.ok){let a=await c.text();g=`HTTP ${c.status}: ${a}`}}catch(a){g=a.message,f="FAILED"}return await d.A.notificationLog.create({data:{gatewayId:h.id,channel:"SMS",recipient:a,subject:c,content:b,status:"SENT"===f?"SENT":"FAILED",errorReason:g||null}}),{success:"SENT"===f,error:g||void 0}}catch(a){return console.error("[sendSMS Error]:",a),{success:!1,error:a.message}}}async function h(a,b,c,g,h){try{let g=await d.A.notificationGateway.findFirst({where:{channel:"EMAIL",isActive:!0}}),i={};if(g?.credentialsEncrypted)try{let a=(0,e.Yc)(g.credentialsEncrypted);a&&(i=JSON.parse(a))}catch(a){console.error("Error decrypting email credentials:",a)}let j=(h?.smtpHost||i.smtpHost||process.env.SMTP_HOST||"smtp.gmail.com").trim(),k=Number(h?.smtpPort||i.smtpPort||process.env.SMTP_PORT)||587,l=(h?.smtpUser||i.smtpUser||process.env.GMAIL_USER||process.env.SMTP_USER||"").trim(),m=(h?.smtpPass||i.smtpPass||process.env.GMAIL_APP_PASSWORD||process.env.SMTP_PASS||"").replace(/\s+/g,"").trim();if(!l||!m)return await d.A.notificationLog.create({data:{channel:"EMAIL",recipient:a,subject:b,content:c,status:"FAILED",errorReason:"No Gmail SMTP credentials configured in database or .env"}}),{success:!1,error:"Gmail SMTP গেটওয়ে এখনও কনফিগার করা হয়নি। অ্যাডমিন প্যানেলে (Admin -> Notifications) গিয়ে আপনার Gmail এবং ১৬-সংখ্যার Google App Password সেভ করুন।"};let n=j.toLowerCase().includes("gmail.com")||l.toLowerCase().endsWith("@gmail.com")?f.createTransport({service:"gmail",auth:{user:l,pass:m},tls:{rejectUnauthorized:!1}}):f.createTransport({host:j,port:k,secure:465===k,auth:{user:l,pass:m},tls:{rejectUnauthorized:!1}}),o=g?.senderId||process.env.SMTP_SENDER_NAME||"ENMAR Organic Food",p={from:`"${o}" <${l}>`,to:a,subject:b,html:c},q=await n.sendMail(p);return await d.A.notificationLog.create({data:{gatewayId:g?.id||null,channel:"EMAIL",recipient:a,subject:b,content:c,status:"SENT",errorReason:null}}),{success:!0,messageId:q.messageId}}catch(e){console.error("[sendEmail Error]:",e);try{let f=await d.A.notificationGateway.findFirst({where:{channel:"EMAIL"}});await d.A.notificationLog.create({data:{gatewayId:f?.id,channel:"EMAIL",recipient:a,subject:b,content:c,status:"FAILED",errorReason:e.message||"Failed to send email via SMTP"}})}catch(a){}return{success:!1,error:e.message}}}async function i(a){let b=`https://enmar.shop/track/${a.trackingId}`,c=`Dear ${a.customerName}, your order (${a.orderNumber}) of ৳${a.totalAmount} is confirmed! Track live parcel: ${b}`;g(a.customerPhone,c,"Order Confirmation",a.id).catch(console.error);let d=`
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
      <h2 style="color: #14421a; margin-top: 0;">🌱 Order Confirmed!</h2>
      <p style="font-size: 14px; color: #374151;">Dear <strong>${a.customerName}</strong>,</p>
      <p style="font-size: 14px; color: #374151;">Thank you for your order <strong>#${a.orderNumber}</strong>. We are preparing your fresh organic items for delivery.</p>
      
      <div style="background: #fdfbf7; padding: 18px; border-radius: 12px; margin: 20px 0; border: 1px solid #f3eedf;">
        <p style="margin: 4px 0; font-size: 13px;"><strong>Tracking ID:</strong> ${a.trackingId}</p>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Payment Method:</strong> ${a.paymentMethod}</p>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Delivery Address:</strong> ${a.shippingAddress} (${a.deliveryZone||"Standard"})</p>
        <hr style="border: none; border-top: 1px dashed #e5e7eb; margin: 12px 0;" />
        <div style="font-size: 13px; line-height: 1.8;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #4b5563;">Products Subtotal (পণ্যের মূল্য):</span>
            <span style="font-weight: 600; font-family: monospace;">৳${a.subtotal}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #4b5563;">Delivery Charge (ডেলিভারি চার্জ):</span>
            <span style="font-weight: 600; font-family: monospace;">${0===Number(a.shippingFee)?"FREE (৳0)":`৳${a.shippingFee}`}</span>
          </div>
          ${Number(a.discountAmount)>0?`
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #15803d;">
            <span>Discount (${a.promoCodeText||"Coupon"}):</span>
            <span style="font-family: monospace;">-৳${a.discountAmount}</span>
          </div>`:""}
          ${Number(a.coinsDiscount)>0?`
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #b45309;">
            <span>Coins Discount:</span>
            <span style="font-family: monospace;">-৳${a.coinsDiscount}</span>
          </div>`:""}
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; color: #14421a; border-top: 2px solid #14421a; padding-top: 8px; margin-top: 8px;">
            <span>Total Payable Amount (সর্বমোট বিল):</span>
            <span style="font-family: monospace;">৳${a.totalAmount}</span>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${b}" style="background: #14421a; color: #ffffff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
          Track Parcel Live
        </a>
      </div>

      <p style="color: #6b7280; font-size: 12px; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 16px; margin-bottom: 0;">
        Have questions? Reply directly to this email or call our hotline.
      </p>
    </div>
  `;h(a.customerEmail,`Order Received #${a.orderNumber}`,d,a.id).catch(console.error);let e=`[ALERT] New Order received! No: ${a.orderNumber}, Amount: ৳${a.totalAmount}, Customer: ${a.customerName} (${a.customerPhone}).`;g(process.env.ADMIN_ALERT_PHONE||"01614113082",e,"Admin New Order Alert",a.id).catch(console.error)}async function j(a,b,c){let d=`https://enmar.shop/track/${a.trackingId}`,e=b;"CONFIRMED"===b&&(e="Verified & Confirmed"),"PROCESSING"===b&&(e="Processing in Queue (প্রক্রিয়াধীন)"),"MAKING"===b&&(e="Making / Freshly Preparing (তৈরি হচ্ছে)"),"PACKED"===b&&(e="Freshly Packed at Warehouse"),"SHIPPED"===b&&(e=`Handed over to ${a.courierPartner||"Courier"} Logistics`),"OUT_FOR_DELIVERY"===b&&(e="Out for Delivery with Rider"),"DELIVERED"===b&&(e="Delivered Successfully"),"CANCELLED"===b&&(e="Cancelled");let f="CANCELLED"===b?`Order #${a.orderNumber} Cancelled. ${c||""}. Tracking: ${d}`:`Order #${a.orderNumber} Update: Your parcel status is now [${e}]. Track: ${d}`;if("CANCELLED"===b){let b=`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
        <h2 style="color: #dc2626; margin-top: 0;">Order Cancelled</h2>
        <p style="font-size: 14px; color: #374151;">Dear <strong>${a.customerName}</strong>,</p>
        <p style="font-size: 14px; color: #374151;">Your order <strong>#${a.orderNumber}</strong> has been cancelled.</p>
        <div style="background: #fef2f2; padding: 16px; border-radius: 12px; margin: 20px 0; border: 1px solid #fee2e2;">
          <p style="margin: 4px 0; font-size: 13px;"><strong>Tracking ID:</strong> ${a.trackingId}</p>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Cancellation Reason:</strong> ${c||a.cancellationReason||"Cancelled by admin/customer"}</p>
        </div>
        <p><a href="${d}" style="background: #14421a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">View Tracking Details</a></p>
      </div>
    `;h(a.customerEmail,`Order #${a.orderNumber} Cancelled`,b,a.id).catch(console.error)}g(a.customerPhone,f,"Order Status Update",a.id).catch(console.error)}},58912:(a,b,c)=>{"use strict";c.d(b,{Yc:()=>i,w:()=>h});var d=c(55511),e=c.n(d);let f="aes-256-cbc",g=e().createHash("sha256").update(process.env.ENCRYPTION_SECRET||"enmar_super_secure_vault_key_32_bytes_2026!").digest();function h(a){if(!a)return"";try{let b=e().randomBytes(16),c=e().createCipheriv(f,g,b),d=c.update(a,"utf8","hex");return d+=c.final("hex"),`${b.toString("hex")}:${d}`}catch(b){return console.error("[Crypto Encrypt Error]:",b),`b64:${Buffer.from(a,"utf8").toString("base64")}`}}function i(a){if(!a)return"";try{if(a.startsWith("b64:"))return Buffer.from(a.slice(4),"base64").toString("utf8");let b=a.split(":");if(3===b.length){let[a,c,d]=b,f=(process.env.ENCRYPTION_SECRET||process.env.SESSION_SECRET||"enmar_default_vault_secret_key_32_bytes!").slice(0,32).padEnd(32,"0");try{let b=e().createDecipheriv("aes-256-gcm",Buffer.from(f),Buffer.from(a,"hex"));b.setAuthTag(Buffer.from(c,"hex"));let g=b.update(d,"hex","utf8");return g+=b.final("utf8")}catch(a){}}if(2===b.length){let[a,c]=b,d=e().createDecipheriv(f,g,Buffer.from(a,"hex")),h=d.update(c,"hex","utf8");return h+=d.final("utf8")}return a}catch(a){return console.error("[Crypto Decrypt Error]:",a),""}}},70373:(a,b,c)=>{"use strict";c.d(b,{A:()=>g,z:()=>f});var d=c(96330);let e=function(){let a=process.env.DATABASE_URL;if(a){a=a.trim().replace(/^["']|["']$/g,"").replace(/\.+$/,"").trim();try{let b=a.indexOf("://");if(-1!==b){let c=a.substring(0,b),d=a.substring(b+3),e=d.lastIndexOf("@");if(-1!==e){let b=d.substring(0,e),f=d.substring(e+1),g=b.indexOf(":");if(-1!==g){let d=b.substring(0,g),e=b.substring(g+1),h=encodeURIComponent(decodeURIComponent(e));a=`${c}://${d}:${h}@${f}`}}}if(a.includes("tidbcloud.com")&&!a.includes("sslaccept=")&&!a.includes("ssl=")){let b=a.includes("?")?"&":"?";a=`${a}${b}sslaccept=strict`}if(!a.includes("connection_limit=")){let b=a.includes("?")?"&":"?";a=`${a}${b}connection_limit=10&pool_timeout=20&connect_timeout=15`}}catch(a){}return a}}(),f=globalThis.prisma??new d.PrismaClient({datasources:e?{db:{url:e}}:void 0,log:["error"]}),g=f},78335:()=>{},96487:()=>{}};