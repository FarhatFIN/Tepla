const USERNAME_REGEX = /^[A-Za-z0-9_]{4,32}$/;

export const normalizeUsername = (value: string): string =>
  value.trim().replace(/^@+/, "").toLowerCase();

export const isValidUsername = (value: string): boolean =>
  USERNAME_REGEX.test(normalizeUsername(value));

export const assertValidUsername = (value: string): string => {
  const normalized = normalizeUsername(value);

  if (!isValidUsername(normalized)) {
    throw new Error(
      "Username must be 4-32 characters and contain only letters, numbers, and underscores.",
    );
  }

  return normalized;
};

export const parseLimit = (
  value: string | null | undefined,
  defaultValue: number,
  maxValue: number,
): number => {
  const parsed = Number(value ?? defaultValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return Math.min(Math.floor(parsed), maxValue);
};

export const ensureString = (
  value: unknown,
  message: string,
): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(message);
  }

  return value.trim();
};

export const asOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const normalizeEmail = (value: unknown): string | null => {
  const email = asOptionalString(value);
  return email ? email.toLowerCase() : null;
};

export const normalizePhone = (value: unknown): string | null => {
  const rawPhone = asOptionalString(value);
  if (!rawPhone) {
    return null;
  }

  const hasPlusPrefix = rawPhone.startsWith("+");
  const digitsOnly = rawPhone.replace(/\D/g, "");
  if (!digitsOnly) {
    return null;
  }

  return `${hasPlusPrefix ? "+" : ""}${digitsOnly}`;
};

export const normalizeBirthDate = (value: unknown): string | null => {
  const birthDate = asOptionalString(value);
  if (!birthDate) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    throw new Error("Birth date must use the YYYY-MM-DD format.");
  }

  const parsed = new Date(`${birthDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Birth date is invalid.");
  }

  const today = new Date();
  const normalizedToday = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  if (parsed.getTime() > normalizedToday) {
    throw new Error("Birth date cannot be in the future.");
  }

  return birthDate;
};

export const normalizeStatusEmoji = (value: unknown): string | null => {
  const emoji = asOptionalString(value);
  if (!emoji) {
    return null;
  }

  if (emoji.length > 10) {
    throw new Error("Status emoji is too long.");
  }

  return emoji;
};

export const normalizeHexColor = (value: unknown): string | null => {
  const color = asOptionalString(value);
  if (!color) {
    return null;
  }

  if (!/^#([A-Fa-f0-9]{6})$/.test(color)) {
    throw new Error("Username color must use the #RRGGBB format.");
  }

  return color.toUpperCase();
};

export const normalizePositiveNumber = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
};
