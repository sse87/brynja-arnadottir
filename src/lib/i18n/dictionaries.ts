import 'server-only';
import is from '@/data/dictionaries/is.json';
import en from '@/data/dictionaries/en.json';
import type { Dictionary } from '@/data/schema/dictionary';
import type { Locale } from './config';

// `satisfies` makes a missing/renamed key in either JSON a compile error.
const dictionaries = {
  is: is satisfies Dictionary,
  en: en satisfies Dictionary,
} as const;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/**
 * Only the namespaces Client Components need are serialized to the browser.
 * `notFound` / `error` are included because not-found.tsx receives no params and error.tsx must be
 * a Client Component — both read their copy from the I18nProvider.
 */
export type ClientMessages = Pick<
  Dictionary,
  'languageToggle' | 'nav' | 'gallery' | 'lightbox' | 'inquiry' | 'about' | 'notFound' | 'error'
>;

export function pickClientMessages(d: Dictionary): ClientMessages {
  return {
    languageToggle: d.languageToggle,
    nav: d.nav,
    gallery: d.gallery,
    lightbox: d.lightbox,
    inquiry: d.inquiry,
    about: d.about,
    notFound: d.notFound,
    error: d.error,
  };
}
