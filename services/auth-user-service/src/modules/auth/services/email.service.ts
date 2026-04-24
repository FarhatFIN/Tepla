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

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.SMTP_USER) {
    logger.info(`[DEV] Email to ${to}: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    logger.error('Failed to send email', { error: (err as Error).message });
    throw err;
  }
}

export async function sendSecurityAlertEmail(to: string, event: string, device: string, ip: string, country?: string): Promise<void> {
  const time = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#130D24;color:#F0EAFF;border-radius:16px;">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="font-size:32px;font-weight:800;background:linear-gradient(135deg,#5B21B6,#6C3DE8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0;">⚡ Tepla</h1>
      </div>
      <div style="background:#1E1535;border-radius:12px;padding:24px;margin-bottom:24px;">
        <p style="font-size:18px;font-weight:600;color:#F59E0B;margin:0 0 16px;">⚠️ ${event}</p>
        <table style="width:100%;color:#9B89C4;font-size:14px;">
          <tr><td style="padding:4px 0;">Device:</td><td style="color:#F0EAFF;">${device}</td></tr>
          <tr><td style="padding:4px 0;">IP:</td><td style="color:#F0EAFF;">${ip}</td></tr>
          <tr><td style="padding:4px 0;">Time:</td><td style="color:#F0EAFF;">${time}</td></tr>
          ${country ? `<tr><td style="padding:4px 0;">Location:</td><td style="color:#F0EAFF;">${country}</td></tr>` : ''}
        </table>
      </div>
      <div style="text-align:center;">
        <a href="#" style="display:inline-block;background:linear-gradient(135deg,#5B21B6,#6C3DE8);color:white;padding:12px 32px;border-radius:12px;text-decoration:none;font-weight:500;">Secure my account</a>
      </div>
      <p style="font-size:12px;color:#5C4D87;text-align:center;margin-top:16px;">If this wasn't you, secure your account immediately.</p>
    </div>`;

  if (!process.env.SMTP_USER) {
    logger.info(`[DEV] Security alert for ${to}: ${event}`);
    return;
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject: `⚠️ Tepla — ${event}`, html });
  } catch (err) {
    logger.error('Failed to send security alert', { error: (err as Error).message });
  }
}

export async function sendLoginAlertEmail(to: string, device: string, ip: string, location?: string): Promise<void> {
  const time = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const subject = 'New login to your Tepla account';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #0f0f0f; color: #ffffff; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">Tepla</h1>
      </div>
      <div style="background: #1a1a2e; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="font-size: 18px; font-weight: 600; color: #fbbf24; margin: 0 0 16px;">⚠️ New login detected</p>
        <table style="width: 100%; color: #a1a1aa; font-size: 14px;">
          <tr><td style="padding: 4px 0;">Device:</td><td style="color: #fff;">${device}</td></tr>
          <tr><td style="padding: 4px 0;">IP:</td><td style="color: #fff;">${ip}</td></tr>
          <tr><td style="padding: 4px 0;">Time:</td><td style="color: #fff;">${time}</td></tr>
          ${location ? `<tr><td style="padding: 4px 0;">Location:</td><td style="color: #fff;">${location}</td></tr>` : ''}
        </table>
      </div>
      <p style="font-size: 13px; color: #71717a; text-align: center;">If this wasn't you, go to Settings → Sessions and terminate it.</p>
    </div>
  `;

  if (!process.env.SMTP_USER) {
    logger.info(`[DEV] Login alert for ${to}: ${device} / ${ip}`);
    return;
  }

  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    logger.error('Failed to send login alert', { error: (err as Error).message });
  }
}
