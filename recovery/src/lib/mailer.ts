import nodemailer from 'nodemailer';

/**
 * Gmail SMTP mailer for OTP delivery.
 *
 * Requires these env vars in .env.local:
 *   GMAIL_USER          your full Gmail address (e.g. you@gmail.com)
 *   GMAIL_APP_PASSWORD  a Google "App Password" (NOT your normal password) —
 *                       create at https://myaccount.google.com/apppasswords
 *                       (requires 2-Step Verification enabled on the account).
 */

const GMAIL_USER = process.env.GMAIL_USER;
// Google shows app passwords with spaces ("abcd efgh ijkl mnop"); SMTP needs
// them with no spaces, so strip any whitespace defensively.
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');

export function isMailerConfigured(): boolean {
  return !!(GMAIL_USER && GMAIL_APP_PASSWORD);
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!isMailerConfigured()) {
    throw new Error('Email is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local');
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a2e;">
      <h2 style="margin: 0 0 8px;">Your reFlow verification code</h2>
      <p style="color: #555; margin: 0 0 24px;">Enter this code to finish signing in. It expires in 10 minutes.</p>
      <div style="font-size: 34px; font-weight: 700; letter-spacing: 8px; text-align: center;
                  padding: 16px; background: #f4efe8; border-radius: 12px; color: #8b3e17;">
        ${code}
      </div>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>`;

  await getTransporter().sendMail({
    from: `reFlow <${GMAIL_USER}>`,
    to,
    subject: `reFlow verification code: ${code}`,
    text: `Your reFlow verification code is ${code}. It expires in 10 minutes.`,
    html,
  });
}
