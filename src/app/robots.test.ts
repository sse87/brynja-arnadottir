import { afterEach, describe, expect, it, vi } from 'vitest';
import robots from './robots';

describe('robots', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('allows everything and points at the absolute sitemap URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://archive.example.is');
    expect(robots()).toEqual({
      rules: { userAgent: '*', allow: '/' },
      sitemap: 'https://archive.example.is/sitemap.xml',
    });
  });
});
