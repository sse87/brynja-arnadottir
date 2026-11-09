import { describe, expect, it, vi } from 'vitest';
import type { Album, Exhibition, PressItem } from '@/data/schema/about';

vi.mock('server-only', () => ({}));

const {
  compareAlbums,
  compareExhibitions,
  comparePress,
  getAlbum,
  getAlbums,
  getBiography,
  getExhibitions,
  getPressItems,
} = await import('./about');

describe('about comparators (SPEC §5.2)', () => {
  it('sorts exhibitions ascending by partial date, tie-break by id', () => {
    const list = [
      { id: 'EXH-1985-02', date: '1985-09' },
      { id: 'EXH-1968-02', date: '1968' },
      { id: 'EXH-1968-01', date: '1968' },
      { id: 'EXH-1968-03', date: '1968-03-15' },
    ] as Exhibition[];
    expect(list.toSorted(compareExhibitions).map((e) => e.id)).toEqual([
      'EXH-1968-01',
      'EXH-1968-02',
      'EXH-1968-03',
      'EXH-1985-02',
    ]);
  });

  it('sorts a season at its first month', () => {
    const list = [
      { id: 'EXH-2011-02', date: '2011', season: 'autumn' },
      { id: 'EXH-2011-03', date: '2011-10' },
      { id: 'EXH-2011-01', date: '2011-07' },
    ] as Exhibition[];
    expect(list.toSorted(compareExhibitions).map((e) => e.id)).toEqual([
      'EXH-2011-01',
      'EXH-2011-02',
      'EXH-2011-03',
    ]);
  });

  it('sorts albums and press descending by date', () => {
    const albums = [
      { id: 'a', date: '1985' },
      { id: 'b', date: '1991-11' },
      { id: 'c', date: '1985-09' },
    ] as Album[];
    expect(albums.toSorted(compareAlbums).map((a) => a.id)).toEqual(['b', 'c', 'a']);

    const press = [
      { id: 'PRESS-1974-001', publishedAt: '1974-05-18' },
      { id: 'PRESS-1991-002', publishedAt: '1991-11' },
    ] as PressItem[];
    expect(press.toSorted(comparePress).map((p) => p.id)).toEqual([
      'PRESS-1991-002',
      'PRESS-1974-001',
    ]);
  });
});

describe('about loader', () => {
  it('loads every file', () => {
    expect(getBiography().body.is.length).toBeGreaterThan(0);
    expect(getExhibitions().length).toBeGreaterThan(0);
    expect(getAlbums().length).toBeGreaterThan(0);
    expect(getPressItems().length).toBeGreaterThan(0);
  });

  it('holds the exhibition list from the previous website', () => {
    const list = getExhibitions();
    expect(list).toHaveLength(30);
    expect(list.filter((e) => e.type === 'group')).toHaveLength(6);
    // Sorted order keeps ids chronological, so ids double as stable anchors.
    expect(list.map((e) => e.id)).toEqual(list.map((e) => e.id).toSorted());
  });

  it('returns sorted lists', () => {
    expect(getExhibitions().toSorted(compareExhibitions)).toEqual(getExhibitions());
    expect(getAlbums().toSorted(compareAlbums)).toEqual(getAlbums());
    expect(getPressItems().toSorted(comparePress)).toEqual(getPressItems());
  });

  it('looks up albums by id', () => {
    const first = getAlbums()[0];
    if (!first) throw new Error('no albums');
    expect(getAlbum(first.id)).toBe(first);
    expect(getAlbum('does-not-exist')).toBeUndefined();
  });
});
