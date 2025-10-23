const passwordChangedTemplate = (name, newPassword) => {
    return `
    <div style="font-family:'Arial',sans-serif; background:#f4f4f7; padding:40px 0; width:100%;">
      <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); overflow:hidden;">
        
        <div style="background:green; color:#fff; text-align:center; padding:30px;">
          <h1 style="margin:0; font-size:28px;">Password Changed Successfully</h1>
        </div>

        <div style="padding:30px; color:#333; font-size:16px; line-height:1.5;">
          <p>Hello ${name},</p>
          <p>Your password has been successfully updated. Here is your new password:</p>
          <p style="font-weight:bold; color:#555;">${newPassword}</p>
          <p>If you did not make this change, please contact support immediately.</p>
        </div>

        <div style="background:#f4f4f7; color:#888; text-align:center; padding:20px; font-size:14px;">
          &copy; ${new Date().getFullYear()} Event Management. All rights reserved.
        </div>

      </div>
    </div>`;
};

module.exports = passwordChangedTemplate;
