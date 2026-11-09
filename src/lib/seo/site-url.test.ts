import { afterEach, describe, expect, it, vi } from 'vitest';
import { absoluteUrl, siteUrl } from './site-url';

describe('siteUrl / absoluteUrl', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses NEXT_PUBLIC_SITE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://archive.example.is');
    expect(absoluteUrl('/is/about')).toBe('https://archive.example.is/is/about');
  });

  it('falls back to localhost when unset', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', undefined);
    expect(siteUrl().origin).toBe('http://localhost:3000');
  });
});
