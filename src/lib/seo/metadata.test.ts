import { describe, expect, it } from 'vitest';
import { openGraphFor } from './metadata';

describe('openGraphFor', () => {
  it('builds the shared fields for a locale and path', () => {
    expect(openGraphFor('is', 'Site', '/about')).toEqual({
      type: 'website',
      locale: 'is_IS',
      alternateLocale: ['en_GB'],
      siteName: 'Site',
      url: '/is/about',
      images: ['/og-default.jpg'],
    });
  });

  it('keeps locale, siteName and url when a page overrides title and images', () => {
    const og = openGraphFor('en', 'Site', '/works/x', {
      title: 'X',
      images: [{ url: 'https://cdn/x.jpg' }],
    });
    expect(og).toMatchObject({
      locale: 'en_GB',
      siteName: 'Site',
      url: '/en/works/x',
      title: 'X',
      images: [{ url: 'https://cdn/x.jpg' }],
    });
  });
});
