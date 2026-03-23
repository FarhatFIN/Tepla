import nodemailer from 'nodemailer';
import { createLogger } from '@tepla/common';

const logger = createLogger('email-service');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || 'Tepla <noreply@tepla.app>';

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const subject = `Your Tepla verification code: ${code}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #0f0f0f; color: #ffffff; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">Tepla</h1>
      </div>
      <div style="text-align: center;">
        <p style="font-size: 16px; color: #a1a1aa; margin-bottom: 24px;">Your verification code</p>
        <div style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #ffffff; background: #1a1a2e; padding: 20px; border-radius: 12px; display: inline-block; margin-bottom: 24px;">${code}</div>
        <p style="font-size: 14px; color: #71717a; margin-bottom: 8px;">Code expires in 10 minutes</p>
        <p style="font-size: 12px; color: #52525b;">If you didn't request this, ignore this email.</p>
      </div>
    </div>
  `;

  if (!process.env.SMTP_USER) {
    logger.info(`[DEV] Email OTP for ${to}: ${code}`);
    return;
  }

  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
    logger.info('OTP email sent', { to: to.replace(/(.{2}).*(@.*)/, '$1***$2') });
  } catch (err) {
    logger.error('Failed to send OTP email', { error: (err as Error).message });
    throw new Error('Failed to send verification email');
  }
}
