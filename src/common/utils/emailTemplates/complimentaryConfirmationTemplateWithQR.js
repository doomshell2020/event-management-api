const complimentaryConfirmationTemplateWithQR = (user, order, qrResults, event) => {

    return `
<div style="font-family:Arial, sans-serif; background:#f4f4f7; padding:40px 20px;">
  <div style="max-width:960px; margin:0 auto; background:#ffffff;
              border-radius:16px; box-shadow:0 8px 28px rgba(0,0,0,0.12);
              overflow:hidden;">

    <!-- HEADER -->
    <div style="background:#2e7d32; color:#fff; text-align:center; padding:36px;">
      <h1 style="margin:0; font-size:30px;">🎟 Complimentary Pass Confirmed</h1>
      <p style="margin-top:8px; font-size:16px;">
        Hello <strong>${user.first_name || user.full_name || 'Guest'}</strong>,
        your complimentary ticket is ready!
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

      <!-- INFO BOX -->
      <div style="margin:28px 0; padding:22px;
                  background:#f1f8e9; border-radius:14px;
                  border:1px solid #c8e6c9;">
        <p style="margin:0;">
          ✅ This is a <strong>complimentary (free)</strong> ticket.<br/>
          No payment is required for this order.
        </p>
      </div>

      <!-- QR CODES -->
      <h3 style="margin-top:10px;">🎫 Your Entry QR Code</h3>

      ${qrResults.map(qr => `
        <div style="border:1px solid #e0e0e0; padding:22px; margin:20px 0;
                    border-radius:16px; background:#ffffff; text-align:center;">

          <p style="margin:0 0 10px;">
            <strong>Ticket ID:</strong> ${qr.order_item_id}
          </p>

          <img src="${qr.qr_image_url}"
               alt="QR Code"
               style="width:200px; margin-top:10px;
                      border:1px solid #ddd; padding:10px;
                      border-radius:12px; background:#fafafa;" />

          <p style="margin-top:12px; color:#555; font-size:14px;">
            Please present this QR code at the event entry
          </p>
        </div>
      `).join("")}

    </div>

    <!-- FOOTER -->
    <div style="background:#f4f4f7; text-align:center;
                padding:26px; color:#777; font-size:14px;">
      <p style="margin:0;">We look forward to seeing you at the event 🎉</p>
      <p style="margin-top:6px;">
        &copy; ${new Date().getFullYear()} Event Management. All rights reserved.
      </p>
    </div>

  </div>
</div>
`;
};

module.exports = complimentaryConfirmationTemplateWithQR;
