export const DEFAULT_LANGUAGE = "en";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const isSupportedLanguage = (value: unknown): value is SupportedLanguageCode =>
  typeof value === "string" &&
  SUPPORTED_LANGUAGES.some((language) => language.code === value);

export const normalizeLanguage = (value: unknown): SupportedLanguageCode =>
  isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;

export const getLanguageLabel = (code: string | null | undefined) =>
  SUPPORTED_LANGUAGES.find((language) => language.code === code)?.label ?? "English";
