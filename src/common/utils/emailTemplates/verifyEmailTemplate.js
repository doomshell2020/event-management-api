const verifyEmailTemplate = (name, verifyLink) => `
  <div style="font-family: 'Arial', sans-serif; background-color:#f4f4f7; padding:40px 0; width:100%;">
    <div style="max-width:600px; margin:0 auto; background-color:#ffffff; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); overflow:hidden;">
      
      <!-- Header -->
      <div style="background-color:#007BFF; color:#ffffff; text-align:center; padding:30px;">
        <h1 style="margin:0; font-size:28px;">Welcome, ${name} 🎉</h1>
      </div>

      <!-- Body -->
      <div style="padding:30px; color:#333333; font-size:16px; line-height:1.5;">
        <p>Thank you for registering at <strong>eboxtickets</strong>.</p>
        <p>Please verify your email address by clicking the button below:</p>

        <!-- CTA Button -->
        <div style="text-align:center; margin:30px 0;">
          <a href="${verifyLink}" 
             style="background-color:#007BFF; color:#ffffff; padding:15px 30px; text-decoration:none; border-radius:8px; font-weight:bold; display:inline-block;">
             Verify Email
          </a>
        </div>

        <p>If you did not create this account, please ignore this email.</p>
      </div>

      <!-- Footer -->
        <div style="background:#f4f4f7; color:#888; text-align:center; padding:20px; font-size:14px;">
          &copy; ${new Date().getFullYear()} Event Management. All rights reserved.
        </div>

    </div>
  </div>
`;

module.exports = verifyEmailTemplate;
