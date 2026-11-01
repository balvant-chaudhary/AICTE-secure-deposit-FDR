import nodemailer from 'nodemailer';

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_USER !== 'your_email') {
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    }
  }
  return transporter;
};

export const sendNotificationEmail = async ({ to, subject, htmlContent, textFallback }) => {
  try {
    const mailer = getTransporter();
    if (mailer) {
      await mailer.sendMail({
        from: '"AICTE SecureDeposit 360" <no-reply@aicte-india.org>',
        to,
        subject,
        text: textFallback || 'AICTE SecureDeposit Notification',
        html: htmlContent
      });
      console.log(`[Email Sent]: Delivered alert to ${to} (${subject})`);
      return true;
    } else {
      // Demo / simulated mode fallback
      console.log(`[Email Simulated]: To: ${to} | Subject: "${subject}" | Content Preview: ${textFallback || 'HTML email content'}`);
      return true;
    }
  } catch (error) {
    console.warn(`[Email Warning]: Could not send email (${error.message}). Continuing in simulated mode.`);
    return false;
  }
};
