const orderConfirmationTemplateWithQR = (user, order, qrResults, event) => {
    return `
    <div style="font-family: 'Arial', sans-serif; background:#f4f4f7; padding:40px 0;">
      <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); overflow:hidden;">

        <!-- HEADER -->
        <div style="background:#1a73e8; color:#fff; text-align:center; padding:30px;">
          <h1 style="margin:0; font-size:28px;">Order Confirmed 🎉</h1>
          <p style="margin:5px 0 0; font-size:16px;">Thank you for your purchase, ${user.first_name}!</p>
        </div>

        <!-- EVENT INFO -->
        <div style="padding:30px; color:#333; font-size:16px; line-height:1.6;">
          <h2 style="margin-top:0; font-size:22px; font-weight:600;">${event.name}</h2>

          <img src="${event.feat_image}" 
               alt="${event.name}" 
               style="width:100%; max-height:260px; object-fit:cover; border-radius:10px; margin-bottom:15px;" />

          <p style="margin:5px 0;"><strong>Location:</strong> ${event.location}</p>

          <p style="margin:5px 0;">
            <strong>Date:</strong><br/>
            ${event.date_from} <br/>
            to <br/>
            ${event.date_to} 
            <span style="color:#555;">(${event.timezone})</span>
          </p>

          <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />

          <!-- ORDER INFO -->
          <p><strong>Order ID:</strong> ${order.order_uid}</p>
          <p><strong>Total Amount:</strong> ₹${order.grand_total}</p>

          <h3 style="margin-top:25px; font-size:20px;">Your Tickets</h3>

          ${qrResults
            .map(
              (qr) => `
              <div style="border:1px solid #ddd; padding:18px; margin:15px 0; border-radius:10px; background:#fafafa;">
                <p style="margin:0 0 10px; font-size:15px;">
                  <strong>Ticket ID:</strong> ${qr.order_item_id}
                </p>

                <img src="${process.env.BASE_URL}uploads/qr_codes/${qr.qr_image}"
                     alt="QR Code"
                     style="width:180px; height:auto; display:block; margin:10px auto 0;" />
              </div>
            `
            )
            .join("")}
        </div>

        <!-- FOOTER -->
        <div style="background:#f4f4f7; text-align:center; padding:20px; color:#888; font-size:14px;">
          &copy; ${new Date().getFullYear()} Event Management. All rights reserved.
        </div>

      </div>
    </div>
  `;
};

module.exports = orderConfirmationTemplateWithQR;
