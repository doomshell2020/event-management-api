const committeeTicketIgnoredTemplate = (user, event, ticket) => {
    return `
    <div style="font-family: 'Arial', sans-serif; background:#f4f4f7; padding:40px 0;">
      <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); overflow:hidden;">

        <!-- HEADER -->
        <div style="background:#ea4335; color:#fff; text-align:center; padding:30px;">
          <h1 style="margin:0; font-size:26px;">Ticket Request Update</h1>
          <p style="margin:8px 0 0; font-size:16px;">
            Committee ticket request ignored
          </p>
        </div>

        <!-- CONTENT -->
        <div style="padding:30px; color:#333; font-size:16px; line-height:1.6;">
          <p>Hi <strong>${user.first_name}</strong>,</p>

          <p>
            Thank you for your interest in the event <strong>${event.name}</strong>.
          </p>

          <p>
            We regret to inform you that your committee ticket request for
            <strong>${ticket.title}</strong> has been ignored at this time.
          </p>

          <p style="margin-top:20px;">
            You may:
          </p>

          <ul style="padding-left:20px; color:#555;">
            <li>Try booking a regular ticket if available</li>
            <li>Contact the committee for more information</li>
            <li>Check for future events and opportunities</li>
          </ul>

          <hr style="border:none; border-top:1px solid #eee; margin:25px 0;" />

          <p style="font-size:14px; color:#666;">
            We appreciate your interest and hope to see you at our events in the future.
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

module.exports = committeeTicketIgnoredTemplate;
