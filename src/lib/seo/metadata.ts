import type { Metadata } from 'next';
import { locales, localeMeta, type Locale } from '@/lib/i18n/config';
import { localizedPath } from '@/lib/i18n/route';

type OpenGraph = NonNullable<Metadata['openGraph']>;
type OpenGraphExtra = { title?: string; description?: string; images?: OpenGraph['images'] };

const ogLocale = (l: Locale) => localeMeta[l].intl.replace('-', '_');

/**
 * Shared Open Graph fields. Next replaces (does not merge) a parent's `openGraph` when a page
 * sets its own, so every page builds its `openGraph` through this to keep locale/siteName/url.
 * `url` is relative; `metadataBase` (root layout) makes it absolute.
 */
export function openGraphFor(
  locale: Locale,
  siteName: string,
  path: string = '',
  extra: OpenGraphExtra = {},
): OpenGraph {
  return {
    type: 'website',
    locale: ogLocale(locale),
    alternateLocale: locales.filter((l) => l !== locale).map(ogLocale),
    siteName,
    url: localizedPath(locale, path),
    images: ['/og-default.jpg'],
    ...extra,
  };
}
