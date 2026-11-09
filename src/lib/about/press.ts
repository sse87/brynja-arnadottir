import type { PressItem } from '@/data/schema/about';
import type { Dictionary } from '@/data/schema/dictionary';
import type { Locale } from '@/lib/i18n/config';
import { formatFileSize } from '@/lib/i18n/format';

/** Above this many items the press page shows year jump links (SPEC §5.6). */
export const YEAR_NAV_THRESHOLD = 15;

type PressCopy = Pick<Dictionary['about'], 'press'> & Pick<Dictionary, 'footer'>;

/** "PDF · 2,3 MB" / "Image · 12.7 kB". */
export function pressFileMeta(item: PressItem, locale: Locale, t: PressCopy): string {
  return `${t.press.fileTypes[item.asset.kind]} · ${formatFileSize(item.asset.bytes, locale)}`;
}

/**
 * Screen-reader tail of the file link: "(PDF, 2.3 MB) (opens in a new tab)". The link's accessible
 * name is built from its content: visible "Open clipping" first (WCAG 2.5.3), then the headline in
 * a span carrying its own `lang` (3.1.2; an aria-label string can't), then this tail.
 */
export function pressLinkDetails(item: PressItem, locale: Locale, t: PressCopy): string {
  const type = t.press.fileTypes[item.asset.kind];
  const size = formatFileSize(item.asset.bytes, locale);
  return `(${type}, ${size}) ${t.footer.opensInNewTab}`;
}

/** The headline translation into `locale`, unless the headline is already in that language. */
export function translationFor(item: PressItem, locale: Locale): string | undefined {
  if (item.headlineLanguage === locale) return undefined;
  return item.headlineTranslation?.[locale] || undefined;
}

/** Item id → `y1974` anchor, for the first item of each year (items are sorted by date). */
export function yearAnchors(items: readonly PressItem[]): Map<string, string> {
  const anchors = new Map<string, string>();
  const seen = new Set<string>();
  for (const item of items) {
    const year = item.publishedAt.slice(0, 4);
    if (seen.has(year)) continue;
    seen.add(year);
    anchors.set(item.id, `y${year}`);
  }
  return anchors;
}
