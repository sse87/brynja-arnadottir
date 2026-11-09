import type { StyleCategory } from '@/data/schema/artwork';

export type ColorFilter = 'all' | StyleCategory;
export type AvailabilityFilter = 'all' | 'reprints';

export interface GalleryFilters {
  color: ColorFilter;
  availability: AvailabilityFilter;
}

export const DEFAULT_FILTERS: GalleryFilters = { color: 'all', availability: 'all' };

export interface Filterable {
  styleCategory: StyleCategory;
  reprint: boolean;
}

const INK_TO_COLOR: Record<string, StyleCategory> = { bw: 'black-and-white', color: 'colorful' };
const COLOR_TO_INK: Record<StyleCategory, string> = { 'black-and-white': 'bw', colorful: 'color' };

type ParamsLike = Pick<URLSearchParams, 'get'>;

/** Whitelist parse — unknown values silently fall back to defaults. */
export function parseFilters(params: ParamsLike | null | undefined): GalleryFilters {
  const ink = params?.get('ink') ?? '';
  return {
    color: Object.hasOwn(INK_TO_COLOR, ink) ? (INK_TO_COLOR[ink] ?? 'all') : 'all',
    availability: params?.get('reprints') === '1' ? 'reprints' : 'all',
  };
}

export function serializeFilters(f: GalleryFilters): string {
  const p = new URLSearchParams();
  if (f.color !== 'all') p.set('ink', COLOR_TO_INK[f.color]);
  if (f.availability === 'reprints') p.set('reprints', '1');
  return p.toString();
}

export function matchesFilters(item: Filterable, f: GalleryFilters): boolean {
  const colorOk = f.color === 'all' || item.styleCategory === f.color;
  const availabilityOk = f.availability === 'all' || item.reprint;
  return colorOk && availabilityOk; // Combined filter = logical AND
}

export function filterItems<T extends Filterable>(items: readonly T[], f: GalleryFilters): T[] {
  return items.filter((i) => matchesFilters(i, f));
}

/** Facet counts: each facet's counts respect the OTHER facet's current value. */
export function facetCounts(items: readonly Filterable[], f: GalleryFilters) {
  const color = { all: 0, 'black-and-white': 0, colorful: 0 } satisfies Record<ColorFilter, number>;
  const availability = { all: 0, reprints: 0 } satisfies Record<AvailabilityFilter, number>;
  for (const i of items) {
    if (f.availability === 'all' || i.reprint) {
      color.all++;
      color[i.styleCategory]++;
    }
    if (f.color === 'all' || i.styleCategory === f.color) {
      availability.all++;
      if (i.reprint) availability.reprints++;
    }
  }
  return { color, availability };
}

export const isDefaultFilters = (f: GalleryFilters) =>
  f.color === 'all' && f.availability === 'all';
