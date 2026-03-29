import crypto from 'crypto';
import { createLogger } from '@tepla/common';

const logger = createLogger('kyc-service');

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN || '';
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY || '';
const SUMSUB_BASE_URL = process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com';
const SUMSUB_LEVEL_NAME = process.env.SUMSUB_LEVEL_NAME || 'basic-kyc-level';
const SUMSUB_WEBHOOK_SECRET = process.env.SUMSUB_WEBHOOK_SECRET || '';

function createSignature(ts: number, method: string, path: string, body?: string): string {
  const data = ts + method.toUpperCase() + path + (body || '');
  return crypto.createHmac('sha256', SUMSUB_SECRET_KEY).update(data).digest('hex');
}

async function sumsubRequest(method: string, path: string, body?: Record<string, unknown>): Promise<any> {
  const ts = Math.floor(Date.now() / 1000);
  const bodyStr = body ? JSON.stringify(body) : undefined;
  const signature = createSignature(ts, method, path, bodyStr);

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-App-Token': SUMSUB_APP_TOKEN,
    'X-App-Access-Sig': signature,
    'X-App-Access-Ts': String(ts),
  };
  if (bodyStr) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method,
    headers,
    body: bodyStr,
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error('Sumsub API error', { status: res.status, path, error: err });
    throw new Error(`Sumsub API error: ${res.status}`);
  }

  return res.json();
}

/** Call at service startup to fail-fast if KYC is not configured */
export function validateKycConfig(): void {
  if (process.env.NODE_ENV === 'production') {
    if (!SUMSUB_APP_TOKEN) throw new Error('SUMSUB_APP_TOKEN is required in production');
    if (!SUMSUB_SECRET_KEY) throw new Error('SUMSUB_SECRET_KEY is required in production');
    if (!SUMSUB_WEBHOOK_SECRET) throw new Error('SUMSUB_WEBHOOK_SECRET is required in production');
  }
}

export class KycService {
  // Create applicant in Sumsub
  async createApplicant(userId: string, email?: string, phone?: string): Promise<{ applicantId: string }> {
    if (!SUMSUB_APP_TOKEN) {
      logger.info('[DEV] KYC create applicant', { userId });
      return { applicantId: `dev_${userId.slice(0, 8)}` };
    }

    const data = await sumsubRequest('POST', `/resources/applicants?levelName=${SUMSUB_LEVEL_NAME}`, {
      externalUserId: userId,
      email,
      phone,
    });

    logger.info('Sumsub applicant created', { userId, applicantId: data.id });
    return { applicantId: data.id };
  }

  // Get SDK access token for frontend widget
  async getAccessToken(userId: string): Promise<{ token: string; userId: string }> {
    if (!SUMSUB_APP_TOKEN) {
      logger.info('[DEV] KYC access token', { userId });
      return { token: `dev_token_${Date.now()}`, userId };
    }

    const data = await sumsubRequest('POST', '/resources/accessTokens/sdk', {
      userId,
      levelName: SUMSUB_LEVEL_NAME,
    });

    return { token: data.token, userId: data.userId };
  }

  // Get applicant status
  async getApplicantStatus(applicantId: string): Promise<{
    reviewStatus: string;
    reviewResult?: { reviewAnswer: string; rejectLabels?: string[] };
  }> {
    if (!SUMSUB_APP_TOKEN) {
      return { reviewStatus: 'completed', reviewResult: { reviewAnswer: 'GREEN' } };
    }

    return sumsubRequest('GET', `/resources/applicants/${applicantId}/status`);
  }

  // Get applicant data
  async getApplicantData(applicantId: string): Promise<any> {
    if (!SUMSUB_APP_TOKEN) {
      return { id: applicantId, externalUserId: 'dev', review: { reviewStatus: 'completed' } };
    }

    return sumsubRequest('GET', `/resources/applicants/${applicantId}/one`);
  }

  // Verify webhook signature — no fallback, must be configured
  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!SUMSUB_WEBHOOK_SECRET) {
      throw new Error('SUMSUB_WEBHOOK_SECRET is not configured. KYC webhooks cannot be verified.');
    }
    const expected = crypto.createHmac('sha256', SUMSUB_WEBHOOK_SECRET).update(body).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  // Parse webhook event
  parseWebhookEvent(body: any): {
    applicantId: string;
    externalUserId: string;
    type: string;
    reviewStatus: string;
    reviewResult?: { reviewAnswer: string; rejectLabels?: string[] };
  } {
    return {
      applicantId: body.applicantId,
      externalUserId: body.externalUserId,
      type: body.type,
      reviewStatus: body.reviewStatus || 'init',
      reviewResult: body.reviewResult,
    };
  }
}
