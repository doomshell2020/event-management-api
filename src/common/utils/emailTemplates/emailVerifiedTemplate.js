const emailVerifiedTemplate = (name,loginUrl) => `
  <div style="font-family:'Arial',sans-serif; background:#f4f4f7; padding:40px 0; width:100%;">
    <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); overflow:hidden;">
      
      <div style="background:#28a745; color:#fff; text-align:center; padding:30px;">
        <h1 style="margin:0; font-size:28px;">Email Verified ✅</h1>
      </div>

      <div style="padding:30px; color:#333; font-size:16px; line-height:1.5;">
        <p>Hello ${name},</p>
        <p>Your email has been successfully verified. You can now log in and access your account.</p>
        <p style="text-align:center; margin-top:30px;">
          <a href=${loginUrl} 
             style="background-color:#28a745; color:#fff; padding:15px 30px; text-decoration:none; border-radius:8px; font-weight:bold;">
             Login Now
          </a>
        </p>
      </div>

      <div style="background:#f4f4f7; color:#888; text-align:center; padding:20px; font-size:14px;">
        &copy; ${new Date().getFullYear()} Event Management. All rights reserved.
      </div>

    </div>
  </div>
`;

module.exports = emailVerifiedTemplate;
