import { notFound } from 'next/navigation';
import { isLocale, locales, defaultLocale, type Locale } from './config';

export type LocaleParams = Promise<{ locale: string }>;

export async function resolveLocale(params: LocaleParams): Promise<Locale> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return locale;
}

/** Path without locale prefix → localized path. `localizedPath('en', '/about')` → `/en/about` */
export function localizedPath(locale: Locale, path: string = ''): string {
  const clean = path === '/' ? '' : path;
  return `/${locale}${clean}`;
}

/** hreflang alternates for generateMetadata. `path` excludes the locale prefix. */
export function alternatesFor(locale: Locale, path: string = '') {
  return {
    canonical: localizedPath(locale, path),
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, localizedPath(l, path)])),
      'x-default': localizedPath(defaultLocale, path),
    },
  };
}
