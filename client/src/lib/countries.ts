export interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
  mask: string;
}

export const countries: Country[] = [
  { code: "RU", name: "Россия", dial: "+7", flag: "\u{1F1F7}\u{1F1FA}", mask: "(XXX) XXX-XX-XX" },
  { code: "UA", name: "Украина", dial: "+380", flag: "\u{1F1FA}\u{1F1E6}", mask: "(XX) XXX-XX-XX" },
  { code: "BY", name: "Беларусь", dial: "+375", flag: "\u{1F1E7}\u{1F1FE}", mask: "(XX) XXX-XX-XX" },
  { code: "KZ", name: "Казахстан", dial: "+7", flag: "\u{1F1F0}\u{1F1FF}", mask: "(XXX) XXX-XX-XX" },
  { code: "US", name: "United States", dial: "+1", flag: "\u{1F1FA}\u{1F1F8}", mask: "(XXX) XXX-XXXX" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "\u{1F1EC}\u{1F1E7}", mask: "XXXX XXXXXX" },
  { code: "DE", name: "Deutschland", dial: "+49", flag: "\u{1F1E9}\u{1F1EA}", mask: "XXXX XXXXXXX" },
  { code: "FR", name: "France", dial: "+33", flag: "\u{1F1EB}\u{1F1F7}", mask: "X XX XX XX XX" },
  { code: "TR", name: "Turkiye", dial: "+90", flag: "\u{1F1F9}\u{1F1F7}", mask: "(XXX) XXX XX XX" },
  { code: "UZ", name: "O'zbekiston", dial: "+998", flag: "\u{1F1FA}\u{1F1FF}", mask: "XX XXX XX XX" },
  { code: "GE", name: "Georgia", dial: "+995", flag: "\u{1F1EC}\u{1F1EA}", mask: "XXX XX XX XX" },
  { code: "AZ", name: "Azerbaijan", dial: "+994", flag: "\u{1F1E6}\u{1F1FF}", mask: "XX XXX XX XX" },
  { code: "AM", name: "Armenia", dial: "+374", flag: "\u{1F1E6}\u{1F1F2}", mask: "XX XXXXXX" },
  { code: "KG", name: "Kyrgyzstan", dial: "+996", flag: "\u{1F1F0}\u{1F1EC}", mask: "XXX XXXXXX" },
  { code: "TJ", name: "Tajikistan", dial: "+992", flag: "\u{1F1F9}\u{1F1EF}", mask: "XX XXX XXXX" },
  { code: "MD", name: "Moldova", dial: "+373", flag: "\u{1F1F2}\u{1F1E9}", mask: "XXXX XXXX" },
  { code: "CN", name: "China", dial: "+86", flag: "\u{1F1E8}\u{1F1F3}", mask: "XXX XXXX XXXX" },
  { code: "JP", name: "Japan", dial: "+81", flag: "\u{1F1EF}\u{1F1F5}", mask: "XX-XXXX-XXXX" },
  { code: "KR", name: "South Korea", dial: "+82", flag: "\u{1F1F0}\u{1F1F7}", mask: "XX-XXXX-XXXX" },
  { code: "IN", name: "India", dial: "+91", flag: "\u{1F1EE}\u{1F1F3}", mask: "XXXXX XXXXX" },
  { code: "BR", name: "Brazil", dial: "+55", flag: "\u{1F1E7}\u{1F1F7}", mask: "(XX) XXXXX-XXXX" },
  { code: "AE", name: "UAE", dial: "+971", flag: "\u{1F1E6}\u{1F1EA}", mask: "XX XXX XXXX" },
  { code: "IL", name: "Israel", dial: "+972", flag: "\u{1F1EE}\u{1F1F1}", mask: "XX-XXX-XXXX" },
];

export const defaultCountry = countries[0];

export function digitsOnly(s: string): string { return s.replace(/\D/g, ""); }

export function maxDigits(mask: string): number {
  return (mask.match(/X/g) || []).length;
}

export function applyMask(digits: string, mask: string): string {
  let result = "";
  let di = 0;
  for (const ch of mask) {
    if (di >= digits.length) break;
    if (ch === "X") { result += digits[di++]; }
    else { result += ch; }
  }
  return result;
}

export const languages = [
  { code: "ru", name: "Русский", flag: "\u{1F1F7}\u{1F1FA}" },
  { code: "en", name: "English", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "uk", name: "Українська", flag: "\u{1F1FA}\u{1F1E6}" },
  { code: "de", name: "Deutsch", flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "fr", name: "Francais", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "es", name: "Espanol", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "tr", name: "Turkce", flag: "\u{1F1F9}\u{1F1F7}" },
  { code: "zh", name: "Chinese", flag: "\u{1F1E8}\u{1F1F3}" },
  { code: "ja", name: "Japanese", flag: "\u{1F1EF}\u{1F1F5}" },
  { code: "ko", name: "Korean", flag: "\u{1F1F0}\u{1F1F7}" },
  { code: "ar", name: "Arabic", flag: "\u{1F1F8}\u{1F1E6}" },
  { code: "pt", name: "Portugues", flag: "\u{1F1E7}\u{1F1F7}" },
  { code: "it", name: "Italiano", flag: "\u{1F1EE}\u{1F1F9}" },
  { code: "kk", name: "Kazakh", flag: "\u{1F1F0}\u{1F1FF}" },
  { code: "uz", name: "O'zbek", flag: "\u{1F1FA}\u{1F1FF}" },
];
