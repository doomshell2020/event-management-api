const orderConfirmationTemplateWithQR = (user, order, qrResults, event) => {

  const getItemTypeLabel = (order, orderItemId) => {
    if (order.ticket?.some(t => t.id == orderItemId)) {
      return { label: "Ticket", color: "#1a73e8", icon: "🎟️" };
    }
    if (order.addon?.some(a => a.id == orderItemId)) {
      return { label: "Addon", color: "#34a853", icon: "➕" };
    }
    if (order.package?.some(p => p.id == orderItemId)) {
      return { label: "Package", color: "#fbbc05", icon: "📦" };
    }
    if (order.committesale?.some(c => c.id == orderItemId)) {
      return { label: "Committee Sale", color: "#9c27b0", icon: "👥" };
    }
    return { label: "Item", color: "#666", icon: "🧾" };
  };

  return `
  <div style="font-family:Arial, sans-serif; background:#f4f4f7; padding:40px 0;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff;
                border-radius:14px; box-shadow:0 6px 24px rgba(0,0,0,0.12);
                overflow:hidden;">

      <!-- HEADER -->
      <div style="background:#1a73e8; color:#fff; text-align:center; padding:32px;">
        <h1 style="margin:0; font-size:28px;">Order Confirmed 🎉</h1>
        <p style="margin-top:6px; font-size:16px;">
          Thank you for your purchase, <strong>${user.first_name}</strong>!
        </p>
      </div>

      <!-- EVENT INFO -->
      <div style="padding:30px; color:#333; font-size:16px; line-height:1.6;">
        <h2 style="margin-top:0; font-size:22px;">${event.name}</h2>

        <img src="${event.feat_image}"
             alt="${event.name}"
             style="width:100%; max-height:260px; object-fit:cover;
                    border-radius:12px; margin-bottom:15px;" />

        <p><strong>📍 Location:</strong> ${event.location}</p>

        <p>
          <strong>🗓 Date:</strong><br/>
          ${event.date_from} <br/>
          to <br/>
          ${event.date_to}
          <span style="color:#555;">(${event.timezone})</span>
        </p>

        <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />

        <!-- ORDER INFO -->
        <p><strong>🧾 Order ID:</strong> ${order.order_uid}</p>
        <p><strong>💰 Total Amount:</strong> ${event.currency_symbol || "₹"}${order.grand_total}</p>
        <h3 style="margin-top:30px; font-size:20px;">Your Items & QR Codes</h3>

        ${qrResults.map((qr) => {
        const type = getItemTypeLabel(order, qr.order_item_id);

    return `
          <div style="border:1px solid #e0e0e0; padding:20px; margin:18px 0;
                      border-radius:14px; background:#fafafa;">

            <!-- ITEM TYPE BADGE -->
            <div style="display:inline-block; padding:6px 14px;
                        background:${type.color}; color:#fff;
                        border-radius:20px; font-size:13px;
                        margin-bottom:12px;">
              ${type.icon} ${type.label}
            </div>

            <p style="margin:10px 0 6px; font-size:15px;">
              <strong>Item ID:</strong> ${qr.order_item_id}
            </p>

            <img src="${process.env.BASE_URL}uploads/qr_codes/${qr.qr_image}"
                 alt="QR Code"
                 style="width:180px; height:auto; display:block;
                        margin:15px auto 0; border:1px solid #ddd;
                        padding:10px; border-radius:10px;
                        background:#fff;" />
          </div>
          `;
  }).join("")}
      </div>

      <!-- FOOTER -->
      <div style="background:#f4f4f7; text-align:center;
                  padding:22px; color:#777; font-size:14px;">
        <p style="margin:0;">
          Please present this QR code at the event entry.
        </p>
        <p style="margin:6px 0 0;">
          &copy; ${new Date().getFullYear()} Event Management. All rights reserved.
        </p>
      </div>

    </div>
  </div>
  `;
};

module.exports = orderConfirmationTemplateWithQR;
