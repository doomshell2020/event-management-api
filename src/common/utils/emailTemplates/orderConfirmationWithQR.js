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

  const currency = event.currency_symbol || "₹";

  return `
  <div style="font-family:Arial, sans-serif; background:#f4f4f7; padding:40px 20px;">
    <div style="max-width:820px; margin:0 auto; background:#ffffff;
                border-radius:16px; box-shadow:0 8px 28px rgba(0,0,0,0.12);
                overflow:hidden;">

      <!-- HEADER -->
      <div style="background:#1a73e8; color:#fff; text-align:center; padding:36px;">
        <h1 style="margin:0; font-size:30px;">Order Confirmed 🎉</h1>
        <p style="margin-top:8px; font-size:16px;">
          Thank you for your purchase, <strong>${user.first_name}</strong>
        </p>
      </div>

      <!-- BODY -->
      <div style="padding:36px; color:#333; font-size:16px; line-height:1.6;">

        <!-- EVENT INFO -->
        <h2 style="margin-top:0;">${event.name}</h2>

        <img src="${event.feat_image}"
             alt="${event.name}"
             style="width:100%; max-height:300px; object-fit:cover;
                    border-radius:14px; margin:18px 0;" />

        <p><strong>📍 Location:</strong> ${event.location}</p>

        <p>
          <strong>🗓 Date:</strong><br/>
          ${event.date_from} to ${event.date_to}
          <span style="color:#666;"> (${event.timezone})</span>
        </p>

        <!-- ORDER SUMMARY -->
        <div style="margin:32px 0; padding:24px;
                    background:#f9fafc; border-radius:14px;
                    border:1px solid #e6e9ef;">

          <h3 style="margin-top:0; font-size:20px;">🧾 Order Summary</h3>

          <table width="100%" cellpadding="8" cellspacing="0"
                 style="border-collapse:collapse; font-size:15px;">
            <tr>
              <td style="color:#555;">Order ID</td>
              <td align="right"><strong>${order.order_uid}</strong></td>
            </tr>
            <tr>
              <td>Subtotal</td>
              <td align="right">${currency}${order.sub_total}</td>
            </tr>
            <tr>
              <td>Discount</td>
              <td align="right">-${currency}${order.discount || "0.00"}</td>
            </tr>
            <tr>
              <td>Tax</td>
              <td align="right">${currency}${order.tax_amount}</td>
            </tr>
            <tr>
              <td colspan="2">
                <hr style="border:none; border-top:1px dashed #ccc;" />
              </td>
            </tr>
            <tr>
              <td style="font-size:16px;"><strong>Total Paid</strong></td>
              <td align="right" style="font-size:20px; color:#1a73e8;">
                <strong>${currency}${order.grand_total}</strong>
              </td>
            </tr>
          </table>

          <hr style="border:none; border-top:1px solid #e0e0e0; margin:18px 0;" />

          <table width="100%" cellpadding="6" cellspacing="0"
                 style="border-collapse:collapse; font-size:14px; color:#555;">
            <tr>
              <td>Payment Method</td>
              <td align="right">${order.payment_gateway || "Online Payment"}</td>
            </tr>
            <tr>
              <td>Transaction ID</td>
              <td align="right" style="word-break:break-all;">
                ${order.payment_intent || "-"}
              </td>
            </tr>
            <tr>
              <td>Order Date</td>
              <td align="right">${order.created_at}</td>
            </tr>
          </table>
        </div>

        <!-- ITEMS & QR -->
        <h3 style="margin-top:10px;">🎟 Your Items & QR Codes</h3>

        ${qrResults.map(qr => {
    const type = getItemTypeLabel(order, qr.order_item_id);
    return `
          <div style="border:1px solid #e0e0e0; padding:22px; margin:20px 0;
                      border-radius:16px; background:#ffffff;">

            <div style="display:inline-block; padding:6px 16px;
                        background:${type.color}; color:#fff;
                        border-radius:20px; font-size:13px;">
              ${type.icon} ${type.label}
            </div>

            <p style="margin:12px 0 8px;">
              <strong>Item ID:</strong> ${qr.order_item_id}
            </p>

            <img src="${process.env.BASE_URL}uploads/qr_codes/${qr.qr_image}"
                 alt="QR Code"
                 style="width:190px; display:block; margin:16px auto 0;
                        border:1px solid #ddd; padding:10px;
                        border-radius:12px; background:#fafafa;" />
          </div>
          `;
  }).join("")}
      </div>

      <!-- FOOTER -->
      <div style="background:#f4f4f7; text-align:center;
                  padding:26px; color:#777; font-size:14px;">
        <p style="margin:0;">Please present this QR code at the event entry.</p>
        <p style="margin-top:6px;">
          &copy; ${new Date().getFullYear()} Event Management. All rights reserved.
        </p>
      </div>

    </div>
  </div>
  `;
};

module.exports = orderConfirmationTemplateWithQR;
