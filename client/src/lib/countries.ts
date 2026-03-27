export interface PhoneRegion {
  code: string;
  name: string;
  flag: string;
  phoneCode: string;
  mask: string;
  continent: 'cis' | 'europe' | 'americas' | 'asia' | 'africa';
}

export const PHONE_REGIONS: PhoneRegion[] = [
  // ── CIS & Russia ──
  { code: 'RU', name: 'Россия', flag: '🇷🇺', phoneCode: '+7', mask: '(###) ###-##-##', continent: 'cis' },
  { code: 'KZ', name: 'Казахстан', flag: '🇰🇿', phoneCode: '+7', mask: '(###) ###-##-##', continent: 'cis' },
  { code: 'BY', name: 'Беларусь', flag: '🇧🇾', phoneCode: '+375', mask: '(##) ###-##-##', continent: 'cis' },
  { code: 'UA', name: 'Україна', flag: '🇺🇦', phoneCode: '+380', mask: '(##) ###-##-##', continent: 'cis' },
  { code: 'UZ', name: "O'zbekiston", flag: '🇺🇿', phoneCode: '+998', mask: '(##) ###-##-##', continent: 'cis' },
  { code: 'KG', name: 'Кыргызстан', flag: '🇰🇬', phoneCode: '+996', mask: '(###) ##-##-##', continent: 'cis' },
  { code: 'TJ', name: 'Тоҷикистон', flag: '🇹🇯', phoneCode: '+992', mask: '(##) ###-##-##', continent: 'cis' },
  { code: 'AM', name: 'Հայաստան', flag: '🇦🇲', phoneCode: '+374', mask: '(##) ##-##-##', continent: 'cis' },
  { code: 'AZ', name: 'Azərbaycan', flag: '🇦🇿', phoneCode: '+994', mask: '(##) ###-##-##', continent: 'cis' },
  { code: 'GE', name: 'საქართველო', flag: '🇬🇪', phoneCode: '+995', mask: '(###) ##-##-##', continent: 'cis' },
  { code: 'MD', name: 'Moldova', flag: '🇲🇩', phoneCode: '+373', mask: '(####) ##-###', continent: 'cis' },
  { code: 'TM', name: 'Türkmenistan', flag: '🇹🇲', phoneCode: '+993', mask: '(#) ###-##-##', continent: 'cis' },

  // ── Europe ──
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪', phoneCode: '+49', mask: '(####) #######', continent: 'europe' },
  { code: 'FR', name: 'France', flag: '🇫🇷', phoneCode: '+33', mask: '# ## ## ## ##', continent: 'europe' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', phoneCode: '+44', mask: '#### ######', continent: 'europe' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹', phoneCode: '+39', mask: '### ### ####', continent: 'europe' },
  { code: 'ES', name: 'España', flag: '🇪🇸', phoneCode: '+34', mask: '### ### ###', continent: 'europe' },
  { code: 'PL', name: 'Polska', flag: '🇵🇱', phoneCode: '+48', mask: '### ### ###', continent: 'europe' },
  { code: 'NL', name: 'Nederland', flag: '🇳🇱', phoneCode: '+31', mask: '## ### ####', continent: 'europe' },
  { code: 'TR', name: 'Türkiye', flag: '🇹🇷', phoneCode: '+90', mask: '(###) ### ## ##', continent: 'europe' },
  { code: 'SE', name: 'Sverige', flag: '🇸🇪', phoneCode: '+46', mask: '## ### ## ##', continent: 'europe' },
  { code: 'NO', name: 'Norge', flag: '🇳🇴', phoneCode: '+47', mask: '### ## ###', continent: 'europe' },
  { code: 'FI', name: 'Suomi', flag: '🇫🇮', phoneCode: '+358', mask: '## ### ####', continent: 'europe' },
  { code: 'DK', name: 'Danmark', flag: '🇩🇰', phoneCode: '+45', mask: '## ## ## ##', continent: 'europe' },
  { code: 'AT', name: 'Österreich', flag: '🇦🇹', phoneCode: '+43', mask: '#### ######', continent: 'europe' },
  { code: 'CH', name: 'Schweiz', flag: '🇨🇭', phoneCode: '+41', mask: '## ### ## ##', continent: 'europe' },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪', phoneCode: '+32', mask: '### ## ## ##', continent: 'europe' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', phoneCode: '+351', mask: '### ### ###', continent: 'europe' },
  { code: 'CZ', name: 'Česko', flag: '🇨🇿', phoneCode: '+420', mask: '### ### ###', continent: 'europe' },
  { code: 'RO', name: 'România', flag: '🇷🇴', phoneCode: '+40', mask: '### ### ###', continent: 'europe' },
  { code: 'GR', name: 'Ελλάδα', flag: '🇬🇷', phoneCode: '+30', mask: '### ### ####', continent: 'europe' },
  { code: 'HU', name: 'Magyarország', flag: '🇭🇺', phoneCode: '+36', mask: '## ### ####', continent: 'europe' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', phoneCode: '+353', mask: '## ### ####', continent: 'europe' },
  { code: 'BG', name: 'България', flag: '🇧🇬', phoneCode: '+359', mask: '## ### ####', continent: 'europe' },
  { code: 'HR', name: 'Hrvatska', flag: '🇭🇷', phoneCode: '+385', mask: '## ### ####', continent: 'europe' },
  { code: 'RS', name: 'Србија', flag: '🇷🇸', phoneCode: '+381', mask: '## ### ####', continent: 'europe' },
  { code: 'SK', name: 'Slovensko', flag: '🇸🇰', phoneCode: '+421', mask: '### ### ###', continent: 'europe' },
  { code: 'SI', name: 'Slovenija', flag: '🇸🇮', phoneCode: '+386', mask: '## ### ###', continent: 'europe' },
  { code: 'LT', name: 'Lietuva', flag: '🇱🇹', phoneCode: '+370', mask: '### #####', continent: 'europe' },
  { code: 'LV', name: 'Latvija', flag: '🇱🇻', phoneCode: '+371', mask: '## ### ###', continent: 'europe' },
  { code: 'EE', name: 'Eesti', flag: '🇪🇪', phoneCode: '+372', mask: '#### ####', continent: 'europe' },

  // ── Americas ──
  { code: 'US', name: 'United States', flag: '🇺🇸', phoneCode: '+1', mask: '(###) ###-####', continent: 'americas' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', phoneCode: '+1', mask: '(###) ###-####', continent: 'americas' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', phoneCode: '+55', mask: '(##) #####-####', continent: 'americas' },
  { code: 'MX', name: 'México', flag: '🇲🇽', phoneCode: '+52', mask: '## #### ####', continent: 'americas' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', phoneCode: '+54', mask: '## ####-####', continent: 'americas' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', phoneCode: '+57', mask: '### ### ####', continent: 'americas' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', phoneCode: '+56', mask: '# #### ####', continent: 'americas' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', phoneCode: '+51', mask: '### ### ###', continent: 'americas' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', phoneCode: '+58', mask: '### ### ####', continent: 'americas' },

  // ── Asia & Middle East ──
  { code: 'CN', name: '中国', flag: '🇨🇳', phoneCode: '+86', mask: '### #### ####', continent: 'asia' },
  { code: 'JP', name: '日本', flag: '🇯🇵', phoneCode: '+81', mask: '##-####-####', continent: 'asia' },
  { code: 'KR', name: '한국', flag: '🇰🇷', phoneCode: '+82', mask: '##-####-####', continent: 'asia' },
  { code: 'IN', name: 'India', flag: '🇮🇳', phoneCode: '+91', mask: '##### #####', continent: 'asia' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', phoneCode: '+62', mask: '####-####-####', continent: 'asia' },
  { code: 'AE', name: 'الإمارات', flag: '🇦🇪', phoneCode: '+971', mask: '## ### ####', continent: 'asia' },
  { code: 'SA', name: 'السعودية', flag: '🇸🇦', phoneCode: '+966', mask: '## ### ####', continent: 'asia' },
  { code: 'IL', name: 'ישראל', flag: '🇮🇱', phoneCode: '+972', mask: '##-###-####', continent: 'asia' },
  { code: 'TH', name: 'ประเทศไทย', flag: '🇹🇭', phoneCode: '+66', mask: '## ### ####', continent: 'asia' },
  { code: 'VN', name: 'Việt Nam', flag: '🇻🇳', phoneCode: '+84', mask: '## ### ## ##', continent: 'asia' },
  { code: 'PH', name: 'Pilipinas', flag: '🇵🇭', phoneCode: '+63', mask: '### ### ####', continent: 'asia' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', phoneCode: '+60', mask: '##-### ####', continent: 'asia' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', phoneCode: '+65', mask: '#### ####', continent: 'asia' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', phoneCode: '+92', mask: '### ### ####', continent: 'asia' },
  { code: 'BD', name: 'বাংলাদেশ', flag: '🇧🇩', phoneCode: '+880', mask: '#### ### ###', continent: 'asia' },
  { code: 'IQ', name: 'العراق', flag: '🇮🇶', phoneCode: '+964', mask: '### ### ####', continent: 'asia' },
  { code: 'IR', name: 'ایران', flag: '🇮🇷', phoneCode: '+98', mask: '### ### ####', continent: 'asia' },
  { code: 'QA', name: 'قطر', flag: '🇶🇦', phoneCode: '+974', mask: '#### ####', continent: 'asia' },
  { code: 'KW', name: 'الكويت', flag: '🇰🇼', phoneCode: '+965', mask: '#### ####', continent: 'asia' },

  // ── Africa & Oceania ──
  { code: 'EG', name: 'مصر', flag: '🇪🇬', phoneCode: '+20', mask: '### ### ####', continent: 'africa' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', phoneCode: '+234', mask: '### ### ####', continent: 'africa' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', phoneCode: '+27', mask: '## ### ####', continent: 'africa' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', phoneCode: '+254', mask: '### ### ###', continent: 'africa' },
  { code: 'MA', name: 'المغرب', flag: '🇲🇦', phoneCode: '+212', mask: '## ### ####', continent: 'africa' },
  { code: 'DZ', name: 'الجزائر', flag: '🇩🇿', phoneCode: '+213', mask: '### ## ## ##', continent: 'africa' },
  { code: 'TN', name: 'تونس', flag: '🇹🇳', phoneCode: '+216', mask: '## ### ###', continent: 'africa' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', phoneCode: '+61', mask: '### ### ###', continent: 'africa' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', phoneCode: '+64', mask: '## ### ####', continent: 'africa' },
];

export function getRegionByCode(code: string): PhoneRegion | undefined {
  return PHONE_REGIONS.find(r => r.code === code);
}

export function getRegionsByContinent(continent: PhoneRegion['continent']): PhoneRegion[] {
  return PHONE_REGIONS.filter(r => r.continent === continent);
}

export const CONTINENT_LABELS: Record<PhoneRegion['continent'], string> = {
  cis: 'CIS & Russia',
  europe: 'Europe',
  americas: 'Americas',
  asia: 'Asia & Middle East',
  africa: 'Africa & Oceania',
};

export const CONTINENT_ORDER: PhoneRegion['continent'][] = ['cis', 'europe', 'americas', 'asia', 'africa'];

export const defaultRegion = PHONE_REGIONS[0];

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

export function maxDigits(mask: string): number {
  return (mask.match(/#/g) || []).length;
}

export function applyMask(digits: string, mask: string): string {
  let result = '';
  let di = 0;
  for (const ch of mask) {
    if (di >= digits.length) break;
    if (ch === '#') { result += digits[di++]; }
    else { result += ch; }
  }
  return result;
}

// Backward compat aliases
export type Country = PhoneRegion;
export const countries = PHONE_REGIONS;

export const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'kk', name: 'Қазақша', flag: '🇰🇿' },
  { code: 'uz', name: "O'zbek", flag: '🇺🇿' },
];
