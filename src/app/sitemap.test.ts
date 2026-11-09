import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { default: sitemap } = await import('./sitemap');
const { getAllArtworks } = await import('@/lib/data/artworks');
const { getAlbums } = await import('@/lib/data/about');

const BASE = 'https://archive.example.is';

describe('sitemap (SPEC Appendix A)', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_SITE_URL', BASE));
  afterEach(() => vi.unstubAllEnvs());

  it('has one entry per route × locale, with unique absolute URLs', () => {
    const entries = sitemap();
    const routes = 5 + getAllArtworks().length + getAlbums().length;
    expect(entries).toHaveLength(routes * 2);
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) expect(url.startsWith(`${BASE}/`)).toBe(true);
  });

  it('enumerates artworks and albums from the data loaders', () => {
    const urls = sitemap().map((e) => e.url);
    const art = getAllArtworks()[0];
    const album = getAlbums()[0];
    expect(art).toBeDefined();
    expect(urls).toContain(`${BASE}/en/works/${art?.slug}`);
    if (album) expect(urls).toContain(`${BASE}/is/about/albums/${album.id}`);
  });

  it('lists is, en and x-default (→ is) alternates on every entry', () => {
    for (const entry of sitemap()) {
      const path = new URL(entry.url).pathname.replace(/^\/(is|en)/, '');
      expect(entry.alternates?.languages).toEqual({
        is: `${BASE}/is${path}`,
        en: `${BASE}/en${path}`,
        'x-default': `${BASE}/is${path}`,
      });
    }
  });
});
