import { describe, expect, it } from 'vitest';
import en from '@/data/dictionaries/en.json';
import is from '@/data/dictionaries/is.json';
import {
  decadeLabel,
  decadeOf,
  exhibitionLabel,
  exhibitionSortKey,
  formatExhibitionDate,
  groupByDecade,
} from './timeline';

const seasons = { is: is.about.exhibitions.seasons, en: en.about.exhibitions.seasons };

describe('exhibition helpers', () => {
  it('sorts a season at its first month, a plain date as itself', () => {
    expect(exhibitionSortKey({ date: '2011', season: 'autumn' })).toBe('2011-09');
    expect(exhibitionSortKey({ date: '2011', season: 'spring' })).toBe('2011-03');
    expect(exhibitionSortKey({ date: '2011-07' })).toBe('2011-07');
    expect(exhibitionSortKey({ date: '1991' })).toBe('1991');
    expect(
      exhibitionSortKey({ date: '2011-07' }) <
        exhibitionSortKey({ date: '2011', season: 'autumn' }),
    ).toBe(true);
  });

  it.each([
    [{ date: '1991' }, '1991', '1991'],
    [{ date: '2011-07' }, 'júlí 2011', 'July 2011'],
    [{ date: '2011', season: 'autumn' as const }, 'haust 2011', 'Autumn 2011'],
    [
      { date: '1968-03-15', endDate: '1968-03-30' },
      '15. mars 1968 – 30. mars 1968',
      '15 March 1968 – 30 March 1968',
    ],
  ])('formats %o', (e, isLabel, enLabel) => {
    expect(formatExhibitionDate(e, 'is', seasons.is)).toBe(isLabel);
    expect(formatExhibitionDate(e, 'en', seasons.en)).toBe(enLabel);
  });

  it('labels an exhibition by its title, else its venue', () => {
    const location = { venue: 'Hafnarborg', countryCode: 'IS' };
    expect(exhibitionLabel({ location }, 'en')).toBe('Hafnarborg');
    expect(exhibitionLabel({ location, title: { is: 'Teikningar', en: 'Drawings' } }, 'en')).toBe(
      'Drawings',
    );
  });
});

describe('timeline helpers (SPEC §5.4)', () => {
  it('maps partial dates of any precision to their decade', () => {
    expect(decadeOf('1968')).toBe(1960);
    expect(decadeOf('1969-12')).toBe(1960);
    expect(decadeOf('1970-01-01')).toBe(1970);
    expect(decadeOf('2008-05-29')).toBe(2000);
  });

  it('labels a decade as an inclusive range', () => {
    expect(decadeLabel(1960)).toBe('1960–1969');
    expect(decadeLabel(2000)).toBe('2000–2009');
  });

  it('groups in input order and keeps item order within a decade', () => {
    const items = [
      { id: 'a', date: '1968-03-15' },
      { id: 'b', date: '1969' },
      { id: 'c', date: '1970-01' },
      { id: 'd', date: '1985-09' },
      { id: 'e', date: '1989' },
    ];
    expect(groupByDecade(items).map(([d, list]) => [d, list.map((i) => i.id)])).toEqual([
      [1960, ['a', 'b']],
      [1970, ['c']],
      [1980, ['d', 'e']],
    ]);
  });

  it('returns no groups for no items', () => {
    expect(groupByDecade([])).toEqual([]);
  });
});
