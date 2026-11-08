import { describe, expect, it } from 'vitest';
import { swapLocale, toggleHref } from './LanguageToggle';
import { isCurrent } from './NavLinks';

describe('swapLocale', () => {
  it('swaps only the first segment', () => {
    expect(swapLocale('/is', 'en')).toBe('/en');
    expect(swapLocale('/is/about/press', 'en')).toBe('/en/about/press');
    expect(swapLocale('/en/works/is', 'is')).toBe('/is/works/is');
    expect(swapLocale('/', 'en')).toBe('/en');
  });
});

describe('toggleHref', () => {
  it('keeps path and query across the switch', () => {
    expect(toggleHref('/is', 'en', 'ink=bw&reprints=1')).toBe('/en?ink=bw&reprints=1');
    expect(toggleHref('/en/about/albums', 'is', '')).toBe('/is/about/albums');
    expect(toggleHref('/en/about/albums', 'is')).toBe('/is/about/albums');
  });
});

describe('NavLinks isCurrent', () => {
  it('matches exact and prefix items', () => {
    expect(isCurrent('/is', { href: '/is', match: 'exact' })).toBe(true);
    expect(isCurrent('/is/about', { href: '/is', match: 'exact' })).toBe(false);
    expect(isCurrent('/is/about/press', { href: '/is/about', match: 'prefix' })).toBe(true);
    expect(isCurrent('/is/aboutx', { href: '/is/about', match: 'prefix' })).toBe(false);
  });
});
