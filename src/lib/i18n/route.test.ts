import { describe, expect, it, vi } from 'vitest';
import { isLocale } from './config';
import { alternatesFor, localizedPath, resolveLocale } from './route';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

describe('isLocale', () => {
  it('accepts only the configured lowercase locales', () => {
    expect(isLocale('is')).toBe(true);
    expect(isLocale('en')).toBe(true);
    for (const v of ['IS', 'de', '', undefined, null, 1]) expect(isLocale(v)).toBe(false);
  });
});

describe('resolveLocale', () => {
  it('returns a valid locale and calls notFound() otherwise', async () => {
    await expect(resolveLocale(Promise.resolve({ locale: 'en' }))).resolves.toBe('en');
    await expect(resolveLocale(Promise.resolve({ locale: 'xx' }))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });
});

describe('localizedPath', () => {
  it('prefixes the locale and collapses the root path', () => {
    expect(localizedPath('is')).toBe('/is');
    expect(localizedPath('en', '/')).toBe('/en');
    expect(localizedPath('en', '/about/press')).toBe('/en/about/press');
  });
});

describe('alternatesFor', () => {
  it('builds canonical + hreflang alternates with x-default → is', () => {
    expect(alternatesFor('en', '/about')).toEqual({
      canonical: '/en/about',
      languages: { is: '/is/about', en: '/en/about', 'x-default': '/is/about' },
    });
    expect(alternatesFor('is').canonical).toBe('/is');
  });
});
