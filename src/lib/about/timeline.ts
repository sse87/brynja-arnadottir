import type { Exhibition, Season } from '@/data/schema/about';
import type { Locale } from '@/lib/i18n/config';
import { formatPartialDate, interpolate } from '@/lib/i18n/format';
import { localize } from '@/lib/i18n/localize';

/** 1968 → 1960. */
export const decadeOf = (date: string): number => Math.floor(Number(date.slice(0, 4)) / 10) * 10;

/** 1960 → "1960–1969". */
export const decadeLabel = (decade: number): string => `${decade}–${decade + 9}`;

/** Groups by decade, keeping the input order of both the groups and the items within them. */
export function groupByDecade<T extends Pick<Exhibition, 'date'>>(
  items: readonly T[],
): [decade: number, items: T[]][] {
  const groups = new Map<number, T[]>();
  for (const item of items) {
    const decade = decadeOf(item.date);
    const list = groups.get(decade);
    if (list) list.push(item);
    else groups.set(decade, [item]);
  }
  return [...groups];
}

/** The month a season starts in, so "autumn 2011" sorts after "July 2011". */
const SEASON_START: Record<Season, string> = {
  spring: '03',
  summer: '06',
  autumn: '09',
  winter: '12',
};

/** Partial ISO date to sort by: `date`, or "YYYY-MM" (the season's first month) for seasons. */
export const exhibitionSortKey = (e: Pick<Exhibition, 'date' | 'season'>): string =>
  e.season ? `${e.date}-${SEASON_START[e.season]}` : e.date;

/** "1991" | "júlí 2011" | "haust 2011" | "15. mars 1968 – 30. mars 1968". */
export function formatExhibitionDate(
  e: Pick<Exhibition, 'date' | 'endDate' | 'season'>,
  locale: Locale,
  seasons: Record<Season, string>,
): string {
  if (e.season) return interpolate(seasons[e.season], { year: e.date });
  const start = formatPartialDate(e.date, locale);
  return e.endDate ? `${start} – ${formatPartialDate(e.endDate, locale)}` : start;
}

/** What to call an exhibition in running text: its title, or the venue when it has none. */
export const exhibitionLabel = (
  e: Pick<Exhibition, 'title' | 'location'>,
  locale: Locale,
): string => (e.title ? localize(e.title, locale) : e.location.venue);
