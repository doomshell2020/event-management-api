const committeeTicketApprovedTemplate = (user, event, ticket, bookingUrl) => {
    return `
    <div style="font-family: 'Arial', sans-serif; background:#f4f4f7; padding:40px 0;">
      <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); overflow:hidden;">

        <!-- HEADER -->
        <div style="background:#34a853; color:#fff; text-align:center; padding:30px;">
          <h1 style="margin:0; font-size:28px;">Ticket Approved ✅</h1>
          <p style="margin:8px 0 0; font-size:16px;">
            Your committee ticket request has been approved
          </p>
        </div>

        <!-- CONTENT -->
        <div style="padding:30px; color:#333; font-size:16px; line-height:1.6;">
          <p>Hi <strong>${user.first_name}</strong>,</p>

          <p>
            Good news! 🎉  
            Your request for a <strong>${ticket.title}</strong> ticket has been approved by the committee.
          </p>

          <h2 style="font-size:22px; margin:20px 0 10px;">
            ${event.name}
          </h2>

          <p style="margin:6px 0;">
            <strong>Ticket Type:</strong> ${ticket.title}
          </p>

          <p style="margin:6px 0;">
            <strong>Status:</strong> <span style="color:#34a853; font-weight:600;">Approved</span>
          </p>

          <hr style="border:none; border-top:1px solid #eee; margin:25px 0;" />

          <p>
            Please proceed to book your ticket using the button below:
          </p>

          <div style="text-align:center; margin:30px 0;">
            <a href="${bookingUrl}"
               style="
                 background:#1a73e8;
                 color:#fff;
                 padding:14px 28px;
                 border-radius:8px;
                 text-decoration:none;
                 font-size:16px;
                 font-weight:600;
                 display:inline-block;
               ">
              Book Your Ticket
            </a>
          </div>

          <p style="font-size:14px; color:#666;">
            ⚠️ This approval is valid for a limited time. Please complete your booking soon.
          </p>
        </div>

        <!-- FOOTER -->
        <div style="background:#f4f4f7; text-align:center; padding:20px; color:#888; font-size:14px;">
          &copy; ${new Date().getFullYear()} Event Management. All rights reserved.
        </div>

      </div>
    </div>
    `;
};

module.exports = committeeTicketApprovedTemplate;
