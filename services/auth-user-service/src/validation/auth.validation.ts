import { ValidationError } from '@tepla/common';

const USERNAME_REGEX = /^[a-z0-9_]{4,32}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const OTP_REGEX = /^\d{6}$/;

export interface PasswordlessRegisterInput {
  username: string;
  displayName: string | null;
  phone: string | null;
  email: string | null;
  language: string;
  birthDate: string | null;
  publicKey: string;
  signingPublicKey: string;
}

export interface EmailPasswordRegisterInput {
  username: string;
  displayName: string | null;
  email: string;
  password: string;
  language: string;
}

export interface EmailLoginInput {
  email: string;
  password: string;
}

export interface EmailCodeVerificationInput {
  email: string;
  code: string;
}

export interface PhoneLoginInput {
  phone: string;
}

export interface PhoneCodeVerificationInput {
  phone: string;
  code: string;
}

export interface RefreshSessionInput {
  refreshToken: string;
}

export interface LogoutInput {
  refreshToken: string | null;
  sessionId: string | null;
}

export interface PasswordResetRequestInput {
  email: string;
}

type InputRecord = Record<string, unknown>;

function parseObject(value: unknown, label: string): InputRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${label} must be an object`);
  }

  return value as InputRecord;
}

function readString(
  source: InputRecord,
  key: string,
  options: { required?: boolean; trim?: boolean; allowEmpty?: boolean } = {},
): string | null {
  const rawValue = source[key];
  const { required = true, trim = true, allowEmpty = false } = options;

  if (rawValue === undefined || rawValue === null) {
    if (required) {
      throw new ValidationError(`${key} is required`);
    }

    return null;
  }

  if (typeof rawValue !== 'string') {
    throw new ValidationError(`${key} must be a string`);
  }

  const value = trim ? rawValue.trim() : rawValue;
  if (!allowEmpty && value.length === 0) {
    if (required) {
      throw new ValidationError(`${key} is required`);
    }

    return null;
  }

  return value;
}

export function normalizeUsername(username: string): string {
  const normalized = username.trim().toLowerCase();

  if (!USERNAME_REGEX.test(normalized)) {
    throw new ValidationError('Username must be 4-32 characters and contain only letters, numbers, or underscores');
  }

  return normalized;
}

export function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(normalized)) {
    throw new ValidationError('A valid email is required');
  }

  return normalized;
}

export function normalizePhone(phone: string): string {
  const compact = phone.replace(/[^\d+]/g, '');
  const normalized = compact.startsWith('+') ? compact : `+${compact}`;

  if (!PHONE_REGEX.test(normalized)) {
    throw new ValidationError('A valid phone number is required');
  }

  return normalized;
}

export function normalizeLanguage(language: string | null): string {
  if (!language) {
    return 'en';
  }

  const normalized = language.trim().toLowerCase();
  if (!/^[a-z]{2,8}(-[a-z0-9]{2,8})?$/.test(normalized)) {
    throw new ValidationError('language must be a valid locale code');
  }

  return normalized;
}

export function normalizeBirthDate(birthDate: string | null): string | null {
  if (!birthDate) {
    return null;
  }

  const normalized = birthDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(normalized))) {
    throw new ValidationError('birthDate must be in YYYY-MM-DD format');
  }

  return normalized;
}

export function normalizeOtpCode(code: string): string {
  const normalized = code.trim();
  if (!OTP_REGEX.test(normalized)) {
    throw new ValidationError('Verification code must be 6 digits');
  }

  return normalized;
}

export function parsePasswordlessRegisterInput(body: unknown): PasswordlessRegisterInput {
  const input = parseObject(body, 'body');
  const username = normalizeUsername(readString(input, 'username')!);
  const displayName = readString(input, 'displayName', { required: false });
  const email = readString(input, 'email', { required: false });
  const phone = readString(input, 'phone', { required: false });

  if (!email && !phone) {
    throw new ValidationError('Either email or phone is required');
  }

  return {
    username,
    displayName,
    phone: phone ? normalizePhone(phone) : null,
    email: email ? normalizeEmail(email) : null,
    language: normalizeLanguage(readString(input, 'language', { required: false })),
    birthDate: normalizeBirthDate(readString(input, 'birthDate', { required: false })),
    publicKey: readString(input, 'publicKey', { required: false }) ?? '',
    signingPublicKey: readString(input, 'signingPublicKey', { required: false }) ?? '',
  };
}

export function parseEmailPasswordRegisterInput(body: unknown): EmailPasswordRegisterInput {
  const input = parseObject(body, 'body');
  const password = readString(input, 'password')!;

  if (password.length < 6) {
    throw new ValidationError('Password must be at least 6 characters');
  }

  return {
    username: normalizeUsername(readString(input, 'username')!),
    displayName: readString(input, 'displayName', { required: false }),
    email: normalizeEmail(readString(input, 'email')!),
    password,
    language: normalizeLanguage(readString(input, 'language', { required: false })),
  };
}

export function parseEmailLoginInput(body: unknown): EmailLoginInput {
  const input = parseObject(body, 'body');
  return {
    email: normalizeEmail(readString(input, 'email')!),
    password: readString(input, 'password')!,
  };
}

export function parseEmailCodeVerificationInput(body: unknown): EmailCodeVerificationInput {
  const input = parseObject(body, 'body');
  return {
    email: normalizeEmail(readString(input, 'email')!),
    code: normalizeOtpCode(readString(input, 'code')!),
  };
}

export function parsePhoneLoginInput(body: unknown): PhoneLoginInput {
  const input = parseObject(body, 'body');
  return {
    phone: normalizePhone(readString(input, 'phone')!),
  };
}

export function parsePhoneCodeVerificationInput(body: unknown): PhoneCodeVerificationInput {
  const input = parseObject(body, 'body');
  return {
    phone: normalizePhone(readString(input, 'phone')!),
    code: normalizeOtpCode(readString(input, 'code')!),
  };
}

export function parseRefreshSessionInput(body: unknown): RefreshSessionInput {
  const input = parseObject(body, 'body');
  return {
    refreshToken: readString(input, 'refreshToken')!,
  };
}

export function parseLogoutInput(body: unknown): LogoutInput {
  const input = parseObject(body, 'body');
  return {
    refreshToken: readString(input, 'refreshToken', { required: false }),
    sessionId: readString(input, 'sessionId', { required: false }),
  };
}

export function parsePasswordResetRequestInput(body: unknown): PasswordResetRequestInput {
  const input = parseObject(body, 'body');
  return {
    email: normalizeEmail(readString(input, 'email')!),
  };
}

export function parseUsernameAvailabilityInput(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ValidationError('username is required');
  }

  return normalizeUsername(value);
}
