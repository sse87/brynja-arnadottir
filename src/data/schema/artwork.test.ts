import { describe, expect, it } from 'vitest';
import { artworkListSchema, artworkSchema, type Artwork } from './artwork';

const base: Artwork = {
  id: 'ART-0001',
  slug: 'hraun-vid-sjo',
  title: { is: 'Hraun við sjó', en: 'Lava by the Sea' },
  image: {
    src: 'https://brynja.b-cdn.net/v1/archive/works/ART-0001.jpg',
    width: 3000,
    height: 2121,
    alt: { is: 'Lýsing', en: 'Description' },
  },
  dimensions: { widthCm: 42, heightCm: 29.7 },
  year: 1978,
  styleCategory: 'black-and-white',
  'available-as-reprint': true,
  medium: { is: 'Tússpenni á pappír', en: 'Ink pen on paper' },
};

const second: Artwork = { ...base, id: 'ART-0002', slug: 'midnaetursol' };

const messages = (input: unknown) =>
  artworkListSchema.safeParse(input).error?.issues.map((i) => i.message) ?? [];

describe('artworkSchema (SPEC §3.1)', () => {
  it('accepts a valid artwork', () => {
    expect(artworkSchema.safeParse(base).success).toBe(true);
    expect(artworkSchema.safeParse({ ...base, year: null }).success).toBe(true);
  });

  it.each([
    ['bad id', { id: 'ART-1' }],
    ['uppercase slug', { slug: 'Hraun' }],
    ['slug with trailing dash', { slug: 'hraun-' }],
    ['year out of range', { year: 1899 }],
    ['fractional year', { year: 1978.5 }],
    ['unknown style category', { styleCategory: 'sepia' }],
    ['missing translation', { title: { is: 'Hraun' } }],
    ['http image', { image: { ...base.image, src: 'http://brynja.b-cdn.net/a.jpg' } }],
    ['non-data blurDataURL', { image: { ...base.image, blurDataURL: 'https://x/y.webp' } }],
    ['extra key', { price: 100 }],
  ])('rejects %s', (_, patch) => {
    expect(artworkSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  });
});

describe('artworkListSchema', () => {
  it('accepts unique ids and slugs', () => {
    expect(messages([base, second])).toEqual([]);
  });

  it('rejects a duplicate slug', () => {
    expect(messages([base, { ...second, slug: base.slug }])).toEqual([
      'Duplicate slug: hraun-vid-sjo',
    ]);
  });

  it('rejects a duplicate id', () => {
    expect(messages([base, { ...second, id: base.id }])).toEqual(['Duplicate id: ART-0001']);
  });

  it('reports the duplicate at the offending index', () => {
    const issue = artworkListSchema.safeParse([base, { ...second, slug: base.slug }]).error
      ?.issues[0];
    expect(issue?.path).toEqual([1, 'slug']);
  });
});
