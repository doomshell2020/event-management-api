const orderConfirmationTemplateWithQR = (user, order, items, qrResults) => {
    return `
    <div style="font-family:'Arial',sans-serif; background:#f4f4f7; padding:40px 0;">
      <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); overflow:hidden;">
        
        <div style="background:#1a73e8; color:#fff; text-align:center; padding:30px;">
          <h1 style="margin:0;">Order Confirmed 🎉</h1>
          <p>Thank you for your purchase, ${user.firstName}!</p>
        </div>

        <div style="padding:30px; color:#333; font-size:16px; line-height:1.6;">

          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Total Amount:</strong> ₹${order.total_amount}</p>

          <h3>Your Tickets</h3>

          ${qrResults
            .map(
              (qr) => `
              <div style="border:1px solid #eee; padding:15px; margin:15px 0; border-radius:8px;">
                
                <p style="margin:0 0 8px;"><strong>Ticket ID:</strong> ${qr.order_item_id}</p>

                <img src="${process.env.BASE_URL}/uploads/qr_codes/${qr.qr_image}"
                     alt="QR Code"
                     style="width:180px; height:auto; display:block; margin-top:10px;" />
              </div>
          `
            )
            .join("")}
        </div>

        <div style="background:#f4f4f7; text-align:center; padding:20px; color:#888;">
          &copy; ${new Date().getFullYear()} Event Management. All rights reserved.
        </div>

      </div>
    </div>`;
};

module.exports = orderConfirmationTemplateWithQR;
