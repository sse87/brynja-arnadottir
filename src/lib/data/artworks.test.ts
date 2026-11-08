import { describe, expect, it, vi } from 'vitest';
import type { Artwork } from '@/data/schema/artwork';

vi.mock('server-only', () => ({}));

const {
  compareArtworks,
  getAllArtworks,
  getArtworkBySlug,
  getArtworkById,
  getNavIndex,
  toGalleryItem,
} = await import('./artworks');

const art = (id: string, year: number | null, sortOrder?: number) =>
  ({ id, year, sortOrder }) as Artwork;

describe('compareArtworks (SPEC §3.4)', () => {
  it('orders newest first, undated last, then sortOrder, then id', () => {
    const sorted = [
      art('ART-0005', null),
      art('ART-0001', 1978, 20),
      art('ART-0002', 1986),
      art('ART-0004', 1978, 10),
      art('ART-0003', 1978, 10),
    ].toSorted(compareArtworks);
    expect(sorted.map((a) => a.id)).toEqual([
      'ART-0002',
      'ART-0003',
      'ART-0004',
      'ART-0001',
      'ART-0005',
    ]);
  });
});

describe('artworks loader', () => {
  it('loads and sorts the data file', () => {
    const all = getAllArtworks();
    expect(all.length).toBeGreaterThan(0);
    expect(all.toSorted(compareArtworks)).toEqual(all);
  });

  it('looks up by slug and id', () => {
    const first = getAllArtworks()[0];
    expect(first).toBeDefined();
    if (!first) return;
    expect(getArtworkBySlug(first.slug)).toBe(first);
    expect(getArtworkById(first.id)).toBe(first);
    expect(getArtworkBySlug('does-not-exist')).toBeUndefined();
  });

  it('projects a lean, localized GalleryItem with `reprint`', () => {
    const first = getAllArtworks()[0];
    if (!first) throw new Error('no artworks');
    const item = toGalleryItem(first, 'en');
    expect(item.title).toBe(first.title.en);
    expect(item.image.alt).toBe(first.image.alt.en);
    expect(item.reprint).toBe(first['available-as-reprint']);
    expect(item).not.toHaveProperty('available-as-reprint');
    expect(item).not.toHaveProperty('medium');
  });

  it('builds a nav index in display order', () => {
    expect(getNavIndex().map((e) => e.slug)).toEqual(getAllArtworks().map((a) => a.slug));
  });
});
