import { afterEach, describe, expect, it } from 'vitest';
import {
  formatArtworkYear,
  formatCm,
  formatDimensions,
  formatPartialDate,
  interpolate,
  plural,
} from './format';
import en from '@/data/dictionaries/en.json';
import is from '@/data/dictionaries/is.json';

describe('interpolate', () => {
  it('replaces known keys and leaves unknown placeholders intact', () => {
    expect(interpolate('{count} of {total}', { count: 3, total: 10 })).toBe('3 of 10');
    expect(interpolate('{count} {missing}', { count: 0 })).toBe('0 {missing}');
  });
});

describe('plural', () => {
  const works = { one: '{count} work', other: '{count} works' };
  const verk = { one: '{count} verk (eitt)', other: '{count} verk' };

  it.each([
    [0, '0 works'],
    [1, '1 work'],
    [2, '2 works'],
    [21, '21 works'],
  ])('en %i → %s', (n, expected) => {
    expect(plural('en', n, works)).toBe(expected);
  });

  // Icelandic: "one" when n % 10 === 1 and n % 100 !== 11.
  it.each([
    [0, '0 verk'],
    [1, '1 verk (eitt)'],
    [2, '2 verk'],
    [11, '11 verk'],
    [21, '21 verk (eitt)'],
    [31, '31 verk (eitt)'],
    [111, '111 verk'],
  ])('is %i → %s', (n, expected) => {
    expect(plural('is', n, verk)).toBe(expected);
  });
});

describe('formatPartialDate', () => {
  it.each([
    ['1968', 'is', '1968'],
    ['1968-03', 'is', 'mars 1968'],
    ['1968-03-15', 'is', '15. mars 1968'],
    ['1968', 'en', '1968'],
    ['1968-03', 'en', 'March 1968'],
    ['1968-03-15', 'en', '15 March 1968'],
  ] as const)('%s (%s) → %s', (iso, locale, expected) => {
    expect(formatPartialDate(iso, locale)).toBe(expected);
  });

  it('returns unparseable input unchanged', () => {
    expect(formatPartialDate('', 'en')).toBe('');
    expect(formatPartialDate('undated', 'is')).toBe('undated');
  });

  describe('UTC edge at midnight', () => {
    const originalTz = process.env.TZ;
    afterEach(() => {
      process.env.TZ = originalTz;
    });

    // Local-time parsing would roll 1 January back to 31 December 1967 west of UTC
    // (and forward on the last day of a month east of UTC).
    it.each([
      'Pacific/Honolulu',
      'America/Los_Angeles',
      'Atlantic/Reykjavik',
      'Pacific/Kiritimati',
    ])('is stable in %s', (tz) => {
      process.env.TZ = tz;
      expect(formatPartialDate('1968', 'en')).toBe('1968');
      expect(formatPartialDate('1968-01', 'en')).toBe('January 1968');
      expect(formatPartialDate('1968-01-01', 'en')).toBe('1 January 1968');
      expect(formatPartialDate('1968-12-31', 'is')).toBe('31. desember 1968');
    });
  });
});

describe('formatCm / formatDimensions', () => {
  it('uses the locale decimal separator and one fraction digit', () => {
    expect(formatCm(29.7, 'is')).toBe('29,7');
    expect(formatCm(29.7, 'en')).toBe('29.7');
    expect(formatCm(35, 'en')).toBe('35');
  });

  it('formats width × height in cm', () => {
    expect(formatDimensions(35, 50, 'en')).toBe('35 × 50 cm');
    expect(formatDimensions(29.7, 42, 'is')).toBe('29,7 × 42 cm');
  });
});

describe('formatArtworkYear', () => {
  it('renders plain, circa and undated years in both locales', () => {
    expect(formatArtworkYear(1978, false, en.lightbox)).toBe('1978');
    expect(formatArtworkYear(1978, undefined, is.lightbox)).toBe('1978');
    expect(formatArtworkYear(1972, true, en.lightbox)).toBe('c. 1972');
    expect(formatArtworkYear(1972, true, is.lightbox)).toBe('um 1972');
    expect(formatArtworkYear(null, true, en.lightbox)).toBe('Undated');
    expect(formatArtworkYear(null, false, is.lightbox)).toBe('Ódagsett');
  });
});
