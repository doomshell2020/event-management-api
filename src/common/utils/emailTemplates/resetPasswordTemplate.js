const resetPasswordTemplate = (name, resetUrl) => {
    return `
    <div style="font-family:'Arial',sans-serif; background:#f4f4f7; padding:40px 0; width:100%;">
    <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); overflow:hidden;">
      
      <div style="background:orange; color:#fff; text-align:center; padding:30px;">
        <h1 style="margin:0; font-size:28px;">Password Reset Request</h1>
      </div>

      <div style="padding:30px; color:#333; font-size:16px; line-height:1.5;">
        <p>Hello ${name},</p>
        <p>You requested a password reset. Click <a href="${resetUrl}">here</a> to reset your password. This link will expire in 1 hour.</p>
        <p>If you didn’t request this, ignore this email.</p>
      </div>

      <div style="background:#f4f4f7; color:#888; text-align:center; padding:20px; font-size:14px;">
        &copy; ${new Date().getFullYear()} Event Management. All rights reserved.
      </div>

    </div>
</div>`
}

module.exports = resetPasswordTemplate;