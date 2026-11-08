export const locales = ['is', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'is';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const localeMeta: Record<Locale, { htmlLang: string; intl: string; label: string }> = {
  is: { htmlLang: 'is', intl: 'is-IS', label: 'Íslenska' },
  en: { htmlLang: 'en', intl: 'en-GB', label: 'English' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}
