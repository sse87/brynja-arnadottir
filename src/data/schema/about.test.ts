import { describe, expect, it } from 'vitest';
import {
  aboutCrossRefIssues,
  albumListSchema,
  albumSchema,
  exhibitionListSchema,
  pressItemSchema,
} from './about';
import { partialDate } from './shared';

const loc = (s: string) => ({ is: s, en: s });

const photo = {
  id: 'p01',
  src: 'https://brynja.b-cdn.net/v1/archive/albums/x/p01.jpg',
  width: 900,
  height: 600,
  alt: loc('alt'),
};
const album = {
  id: 'opening-1985',
  title: loc('Opening'),
  date: '1985-09',
  coverPhotoId: 'p01',
  photos: [photo],
};
const exhibition = {
  id: 'EXH-1985-02',
  date: '1985-09',
  location: { venue: 'Hafnarborg', city: 'Hafnarfirði', countryCode: 'is' },
  type: 'group',
};
const press = {
  id: 'PRESS-1974-001',
  publishedAt: '1974-05-18',
  publication: 'Morgunblaðið',
  headline: 'Línan sem lifir',
  headlineLanguage: 'is',
  asset: { kind: 'pdf', href: '/press/a.pdf', bytes: 100 },
};

describe('partialDate', () => {
  it.each(['1968', '1968-03', '1968-03-15', '1968-12-31'])('accepts %s', (d) => {
    expect(partialDate.safeParse(d).success).toBe(true);
  });
  it.each(['68', '1968-13', '1968-00', '1968-03-32', '1968-3', '1968/03', '19XX'])(
    'rejects %s',
    (d) => {
      expect(partialDate.safeParse(d).success).toBe(false);
    },
  );
});

describe('exhibitionListSchema', () => {
  it('upper-cases the country code', () => {
    expect(exhibitionListSchema.parse([exhibition])[0]?.location.countryCode).toBe('IS');
  });
  it('rejects duplicate ids', () => {
    expect(exhibitionListSchema.safeParse([exhibition, exhibition]).success).toBe(false);
  });
  it('accepts an optional title and a venue without a city', () => {
    const titled = { ...exhibition, title: loc('Nordic Drawing') };
    const noCity = { ...exhibition, location: { venue: 'Ráðhús Siglufjarðar', countryCode: 'IS' } };
    expect(exhibitionListSchema.safeParse([titled]).success).toBe(true);
    expect(exhibitionListSchema.safeParse([noCity]).success).toBe(true);
  });
  it('requires a venue', () => {
    const noVenue = { ...exhibition, location: { city: 'Keflavík', countryCode: 'IS' } };
    expect(exhibitionListSchema.safeParse([noVenue]).success).toBe(false);
  });
  it('allows a season only on a year-only date', () => {
    expect(
      exhibitionListSchema.safeParse([{ ...exhibition, date: '2011', season: 'autumn' }]).success,
    ).toBe(true);
    const monthAndSeason = exhibitionListSchema.safeParse([{ ...exhibition, season: 'autumn' }]);
    expect(monthAndSeason.success).toBe(false);
    expect(monthAndSeason.error?.issues[0]?.path).toEqual([0, 'season']);
    expect(
      exhibitionListSchema.safeParse([{ ...exhibition, date: '2011', season: 'fall' }]).success,
    ).toBe(false);
  });
});

describe('albumSchema', () => {
  it('accepts a valid album', () => {
    expect(albumSchema.safeParse(album).success).toBe(true);
  });
  it('requires coverPhotoId to reference a photo', () => {
    const result = albumSchema.safeParse({ ...album, coverPhotoId: 'p99' });
    expect(result.error?.issues[0]?.message).toBe(
      'coverPhotoId must reference a photo in the album',
    );
  });
  it('requires at least one photo', () => {
    expect(albumSchema.safeParse({ ...album, photos: [] }).success).toBe(false);
  });
  it('rejects duplicate photo ids', () => {
    expect(albumSchema.safeParse({ ...album, photos: [photo, photo] }).success).toBe(false);
  });
  it('rejects duplicate album ids', () => {
    expect(albumListSchema.safeParse([album, album]).success).toBe(false);
  });
});

describe('pressItemSchema', () => {
  it('accepts pdf and image assets', () => {
    expect(pressItemSchema.safeParse(press).success).toBe(true);
    const image = { kind: 'image', href: '/press/a.jpg', width: 10, height: 10, bytes: 1 };
    expect(pressItemSchema.safeParse({ ...press, asset: image }).success).toBe(true);
  });
  it.each([
    ['pdf outside /press', { kind: 'pdf', href: '/files/a.pdf', bytes: 1 }],
    ['pdf kind with image href', { kind: 'pdf', href: '/press/a.jpg', bytes: 1 }],
    ['image without dimensions', { kind: 'image', href: '/press/a.jpg', bytes: 1 }],
    ['unknown kind', { kind: 'video', href: '/press/a.mp4', bytes: 1 }],
  ])('rejects %s', (_, asset) => {
    expect(pressItemSchema.safeParse({ ...press, asset }).success).toBe(false);
  });
  it('allows a partial headline translation', () => {
    expect(pressItemSchema.safeParse({ ...press, headlineTranslation: { en: 'x' } }).success).toBe(
      true,
    );
  });
});

describe('aboutCrossRefIssues', () => {
  const ex = { id: 'EXH-1985-02', albumId: 'opening-1985' };
  const al = { id: 'opening-1985', exhibitionId: 'EXH-1985-02' };

  it('accepts consistent two-way links and unlinked records', () => {
    expect(aboutCrossRefIssues([ex, { id: 'EXH-1968-01' }], [al, { id: 'other' }])).toEqual([]);
  });
  it('reports a missing album', () => {
    expect(aboutCrossRefIssues([{ ...ex, albumId: 'nope' }], [])).toHaveLength(1);
  });
  it('reports a missing exhibition', () => {
    expect(aboutCrossRefIssues([], [al])).toHaveLength(1);
  });
  it('reports links that do not point back at each other', () => {
    const issues = aboutCrossRefIssues(
      [ex, { id: 'EXH-1990-01' }],
      [{ ...al, exhibitionId: 'EXH-1990-01' }],
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('links back to "EXH-1990-01"');
  });
});
