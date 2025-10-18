const transporter = require('../../config/email');

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"Event Management" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
  }
};

module.exports = sendEmail;
