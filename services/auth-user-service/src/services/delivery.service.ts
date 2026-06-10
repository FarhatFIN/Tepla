import { createLogger } from '@tepla/common';

export type VerificationPurpose = 'login' | 'register' | 'password_reset';

const logger = createLogger('auth-user-delivery');

interface MailTransporter {
  sendMail(options: {
    from: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<unknown>;
}

interface SmsClient {
  messages: {
    create(options: {
      body: string;
      from: string;
      to: string;
    }): Promise<unknown>;
  };
}

export class DeliveryService {
  private readonly mailTransporter: MailTransporter | null;
  private readonly smsClient: SmsClient | null;
  private readonly smsFromNumber: string | null;

  constructor() {
    this.mailTransporter = this.createMailTransporter();
    this.smsClient = this.createSmsClient();
    this.smsFromNumber = process.env.TWILIO_FROM_NUMBER || null;
  }

  async sendEmailCode(email: string, code: string, purpose: VerificationPurpose): Promise<void> {
    const subject = this.getEmailSubject(purpose, code);
    const html = this.getEmailHtml(code, purpose);

    if (!this.mailTransporter) {
      logger.info('[DEV] Email verification code generated', { email: this.maskEmail(email), purpose, code });
      return;
    }

    await this.mailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'Tepla <noreply@tepla.app>',
      to: email,
      subject,
      html,
    });
  }

  async sendPhoneCode(phone: string, code: string): Promise<void> {
    if (!this.smsClient || !this.smsFromNumber) {
      logger.info('[DEV] SMS verification code generated', { phone: this.maskPhone(phone), code });
      return;
    }

    await this.smsClient.messages.create({
      body: `Tepla verification code: ${code}`,
      from: this.smsFromNumber,
      to: phone,
    });
  }

  async sendLoginAlert(email: string, deviceName: string, ipAddress: string): Promise<void> {
    if (!this.mailTransporter) {
      logger.info('[DEV] Login alert skipped', { email: this.maskEmail(email), deviceName, ipAddress });
      return;
    }

    await this.mailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'Tepla <noreply@tepla.app>',
      to: email,
      subject: 'New login to your Tepla account',
      html: `
        <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#111827;color:#F9FAFB;border-radius:16px;">
          <h1 style="margin:0 0 16px;font-size:28px;">Tepla</h1>
          <p style="margin:0 0 16px;color:#D1D5DB;">A new login to your account was detected.</p>
          <table style="width:100%;font-size:14px;color:#E5E7EB;">
            <tr><td style="padding:4px 0;">Device</td><td style="padding:4px 0;">${this.escapeHtml(deviceName)}</td></tr>
            <tr><td style="padding:4px 0;">IP</td><td style="padding:4px 0;">${this.escapeHtml(ipAddress)}</td></tr>
            <tr><td style="padding:4px 0;">Time</td><td style="padding:4px 0;">${new Date().toISOString()}</td></tr>
          </table>
        </div>
      `,
    });
  }

  private createMailTransporter(): MailTransporter | null {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return null;
    }

    const nodemailer = require('nodemailer') as {
      createTransport(config: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      }): MailTransporter;
    };
    const port = Number(process.env.SMTP_PORT || '587');
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  private createSmsClient(): SmsClient | null {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
      return null;
    }

    const twilio = require('twilio') as (accountSid: string, authToken: string) => SmsClient;
    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }

  private getEmailSubject(purpose: VerificationPurpose, code: string): string {
    switch (purpose) {
      case 'register':
        return `Confirm your Tepla account: ${code}`;
      case 'password_reset':
        return `Tepla password reset code: ${code}`;
      case 'login':
      default:
        return `Tepla login code: ${code}`;
    }
  }

  private getEmailHtml(code: string, purpose: VerificationPurpose): string {
    const heading = purpose === 'register'
      ? 'Verify your email'
      : purpose === 'password_reset'
        ? 'Password reset request'
        : 'Verify your login';

    const helper = purpose === 'password_reset'
      ? 'Use this code to continue resetting your password.'
      : 'Use this code to continue in Tepla.';

    return `
      <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#111827;color:#F9FAFB;border-radius:16px;">
        <h1 style="margin:0 0 12px;font-size:28px;">Tepla</h1>
        <p style="margin:0 0 8px;font-size:20px;font-weight:600;">${heading}</p>
        <p style="margin:0 0 24px;color:#D1D5DB;">${helper}</p>
        <div style="display:inline-block;padding:16px 20px;border-radius:12px;background:#1F2937;font-size:32px;font-weight:700;letter-spacing:10px;">${code}</div>
        <p style="margin:24px 0 0;color:#9CA3AF;font-size:13px;">This code expires in 10 minutes.</p>
      </div>
    `;
  }

  private maskEmail(email: string): string {
    return email.replace(/(.{2}).*(@.*)/, '$1***$2');
  }

  private maskPhone(phone: string): string {
    return `${phone.slice(0, 3)}***${phone.slice(-2)}`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
