const committeeTicketAssignedTemplate = (user, event, tickets, bookingUrl) => {

    const ticketRows = tickets.map(t => `
    <tr>
      <td style="padding:10px 8px; border-bottom:1px solid #eee;">
        ${t.title}
      </td>
      <td style="padding:10px 8px; border-bottom:1px solid #eee; text-align:center;">
        ${t.qty}
      </td>
    </tr>
  `).join("");

    return `
  <div style="font-family:Arial, sans-serif; background:#f4f4f7; padding:40px 0;">
    <div style="max-width:620px; margin:0 auto; background:#ffffff; border-radius:12px; box-shadow:0 6px 24px rgba(0,0,0,0.12); overflow:hidden;">

      <!-- HEADER -->
      <div style="background:#673ab7; color:#ffffff; text-align:center; padding:30px;">
        <h1 style="margin:0; font-size:28px;">Tickets Assigned 🎟️</h1>
        <p style="margin-top:8px; font-size:16px;">
          A committee member has assigned tickets to you
        </p>
      </div>

      <!-- CONTENT -->
      <div style="padding:30px; color:#333; font-size:16px; line-height:1.6;">
        <p>Hi <strong>${user.first_name}</strong>,</p>

        <p>
          You have received <strong>committee-approved tickets</strong> for the event below.
          Please review the ticket details and complete your booking.
        </p>

        <h2 style="margin:20px 0 10px; font-size:22px;">
          ${event.name}
        </h2>

        <!-- TICKET TABLE -->
        <table style="width:100%; border-collapse:collapse; margin:20px 0;">
          <thead>
            <tr>
              <th style="text-align:left; padding:10px 8px; border-bottom:2px solid #ddd;">
                Ticket Type
              </th>
              <th style="text-align:center; padding:10px 8px; border-bottom:2px solid #ddd;">
                Quantity
              </th>
            </tr>
          </thead>
          <tbody>
            ${ticketRows}
          </tbody>
        </table>

        <p>
          <strong>Status:</strong>
          <span style="color:#34a853; font-weight:600;">
            Approved by Committee
          </span>
        </p>

        <hr style="border:none; border-top:1px solid #eee; margin:25px 0;" />

        <p style="margin-bottom:20px;">
          Click the button below to complete your booking:
        </p>

        <div style="text-align:center; margin:30px 0;">
          <a href="${bookingUrl}"
            style="
              background:#1a73e8;
              color:#ffffff;
              padding:14px 30px;
              border-radius:8px;
              text-decoration:none;
              font-size:16px;
              font-weight:600;
              display:inline-block;
            ">
            Book Your Tickets
          </a>
        </div>

        <p style="font-size:14px; color:#666;">
          ⏳ Please complete your booking soon. Ticket availability is time-sensitive.
        </p>
      </div>

      <!-- FOOTER -->
      <div style="background:#f4f4f7; text-align:center; padding:20px; font-size:14px; color:#888;">
        © ${new Date().getFullYear()} ${event?.company?.name || "Event Management"}.
        All rights reserved.
      </div>

    </div>
  </div>
  `;
};

module.exports = committeeTicketAssignedTemplate;
