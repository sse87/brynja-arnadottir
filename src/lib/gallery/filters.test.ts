import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  facetCounts,
  filterItems,
  isDefaultFilters,
  matchesFilters,
  parseFilters,
  serializeFilters,
  type AvailabilityFilter,
  type ColorFilter,
  type Filterable,
  type GalleryFilters,
} from './filters';

const COLORS: ColorFilter[] = ['all', 'black-and-white', 'colorful'];
const AVAILABILITIES: AvailabilityFilter[] = ['all', 'reprints'];
const ALL_COMBINATIONS: GalleryFilters[] = COLORS.flatMap((color) =>
  AVAILABILITIES.map((availability) => ({ color, availability })),
);

const params = (qs: string) => new URLSearchParams(qs);

describe('parseFilters (SPEC §3.5)', () => {
  const inkCases: [string | null, ColorFilter][] = [
    [null, 'all'],
    ['bw', 'black-and-white'],
    ['color', 'colorful'],
    ['', 'all'],
    ['foo', 'all'],
    ['BW', 'all'],
    ['colorful', 'all'],
    ['black-and-white', 'all'],
    // Inherited Object.prototype keys must not leak through the lookup table.
    ['constructor', 'all'],
    ['toString', 'all'],
    ['__proto__', 'all'],
  ];
  const reprintCases: [string | null, AvailabilityFilter][] = [
    [null, 'all'],
    ['1', 'reprints'],
    ['0', 'all'],
    ['', 'all'],
    ['true', 'all'],
    ['yes', 'all'],
  ];

  for (const [ink, color] of inkCases) {
    for (const [reprints, availability] of reprintCases) {
      it(`ink=${String(ink)} reprints=${String(reprints)} → ${color}/${availability}`, () => {
        const p = new URLSearchParams();
        if (ink !== null) p.set('ink', ink);
        if (reprints !== null) p.set('reprints', reprints);
        expect(parseFilters(p)).toEqual({ color, availability });
      });
    }
  }

  it('returns defaults for null/undefined params', () => {
    expect(parseFilters(null)).toEqual(DEFAULT_FILTERS);
    expect(parseFilters(undefined)).toEqual(DEFAULT_FILTERS);
  });

  it('ignores unrelated params', () => {
    expect(parseFilters(params('utm_source=x&ink=bw&page=2'))).toEqual({
      color: 'black-and-white',
      availability: 'all',
    });
  });
});

describe('serializeFilters', () => {
  it('omits defaults', () => {
    expect(serializeFilters(DEFAULT_FILTERS)).toBe('');
  });

  it.each<[GalleryFilters, string]>([
    [{ color: 'all', availability: 'all' }, ''],
    [{ color: 'all', availability: 'reprints' }, 'reprints=1'],
    [{ color: 'black-and-white', availability: 'all' }, 'ink=bw'],
    [{ color: 'black-and-white', availability: 'reprints' }, 'ink=bw&reprints=1'],
    [{ color: 'colorful', availability: 'all' }, 'ink=color'],
    [{ color: 'colorful', availability: 'reprints' }, 'ink=color&reprints=1'],
  ])('%o → %s', (f, qs) => {
    expect(serializeFilters(f)).toBe(qs);
  });

  it.each(ALL_COMBINATIONS)('round-trips %o', (f) => {
    expect(parseFilters(params(serializeFilters(f)))).toEqual(f);
  });
});

// 6-item fixture covering all four (category × reprint) cells, with uneven cell sizes.
type Item = Filterable & { id: string };
const FIXTURE: Item[] = [
  { id: 'a', styleCategory: 'black-and-white', reprint: true },
  { id: 'b', styleCategory: 'black-and-white', reprint: false },
  { id: 'c', styleCategory: 'colorful', reprint: true },
  { id: 'd', styleCategory: 'colorful', reprint: false },
  { id: 'e', styleCategory: 'black-and-white', reprint: true },
  { id: 'f', styleCategory: 'colorful', reprint: false },
];

const ids = (items: Item[]) => items.map((i) => i.id);

describe('matchesFilters / filterItems (AND semantics)', () => {
  it.each<[GalleryFilters, string[]]>([
    [{ color: 'all', availability: 'all' }, ['a', 'b', 'c', 'd', 'e', 'f']],
    [{ color: 'all', availability: 'reprints' }, ['a', 'c', 'e']],
    [{ color: 'black-and-white', availability: 'all' }, ['a', 'b', 'e']],
    [{ color: 'black-and-white', availability: 'reprints' }, ['a', 'e']],
    [{ color: 'colorful', availability: 'all' }, ['c', 'd', 'f']],
    [{ color: 'colorful', availability: 'reprints' }, ['c']],
  ])('%o → %o', (f, expected) => {
    expect(ids(filterItems(FIXTURE, f))).toEqual(expected);
  });

  it('requires both facets to match', () => {
    const colourOnly = { styleCategory: 'colorful', reprint: false } as const;
    expect(matchesFilters(colourOnly, { color: 'colorful', availability: 'all' })).toBe(true);
    expect(matchesFilters(colourOnly, { color: 'all', availability: 'reprints' })).toBe(false);
    expect(matchesFilters(colourOnly, { color: 'colorful', availability: 'reprints' })).toBe(false);
  });

  it('preserves order and extra fields, and does not mutate the input', () => {
    const input = [...FIXTURE];
    const out = filterItems(input, { color: 'all', availability: 'reprints' });
    expect(out[0]).toBe(FIXTURE[0]);
    expect(input).toEqual(FIXTURE);
  });
});

describe('facetCounts (each facet respects the other facet)', () => {
  it.each<[GalleryFilters, ReturnType<typeof facetCounts>]>([
    [
      { color: 'all', availability: 'all' },
      {
        color: { all: 6, 'black-and-white': 3, colorful: 3 },
        availability: { all: 6, reprints: 3 },
      },
    ],
    [
      { color: 'all', availability: 'reprints' },
      {
        color: { all: 3, 'black-and-white': 2, colorful: 1 },
        availability: { all: 6, reprints: 3 },
      },
    ],
    [
      { color: 'black-and-white', availability: 'all' },
      {
        color: { all: 6, 'black-and-white': 3, colorful: 3 },
        availability: { all: 3, reprints: 2 },
      },
    ],
    [
      { color: 'black-and-white', availability: 'reprints' },
      {
        color: { all: 3, 'black-and-white': 2, colorful: 1 },
        availability: { all: 3, reprints: 2 },
      },
    ],
    [
      { color: 'colorful', availability: 'all' },
      {
        color: { all: 6, 'black-and-white': 3, colorful: 3 },
        availability: { all: 3, reprints: 1 },
      },
    ],
    [
      { color: 'colorful', availability: 'reprints' },
      {
        color: { all: 3, 'black-and-white': 2, colorful: 1 },
        availability: { all: 3, reprints: 1 },
      },
    ],
  ])('%o', (f, expected) => {
    expect(facetCounts(FIXTURE, f)).toEqual(expected);
  });

  it('selected segment count equals the visible result count', () => {
    for (const f of ALL_COMBINATIONS) {
      const counts = facetCounts(FIXTURE, f);
      const visible = filterItems(FIXTURE, f).length;
      expect(counts.color[f.color]).toBe(visible);
      expect(counts.availability[f.availability]).toBe(visible);
    }
  });

  it('is all zeros for an empty list', () => {
    expect(facetCounts([], DEFAULT_FILTERS)).toEqual({
      color: { all: 0, 'black-and-white': 0, colorful: 0 },
      availability: { all: 0, reprints: 0 },
    });
  });
});

describe('isDefaultFilters', () => {
  it.each(ALL_COMBINATIONS)('%o', (f) => {
    expect(isDefaultFilters(f)).toBe(f.color === 'all' && f.availability === 'all');
  });
});
