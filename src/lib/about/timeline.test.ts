import { describe, expect, it } from 'vitest';
import { decadeLabel, decadeOf, groupByDecade } from './timeline';

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
