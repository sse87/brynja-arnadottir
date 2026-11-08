import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { LOCALE_COOKIE } from '@/lib/i18n/config';
import { config, proxy } from './proxy';

const ORIGIN = 'http://localhost:3000';

function run(path: string, cookie?: string) {
  const headers = cookie ? { cookie: `${LOCALE_COOKIE}=${cookie}` } : undefined;
  const res = proxy(new NextRequest(new URL(path, ORIGIN), { headers }));
  const location = res.headers.get('location');
  return { status: res.status, location: location ? location.replace(ORIGIN, '') : null };
}

describe('proxy (SPEC §2.2)', () => {
  it('redirects a prefix-less request to the default locale with 307', () => {
    expect(run('/')).toEqual({ status: 307, location: '/is' });
    expect(run('/about/press')).toEqual({ status: 307, location: '/is/about/press' });
  });

  it('honours the NEXT_LOCALE cookie', () => {
    expect(run('/', 'en')).toEqual({ status: 307, location: '/en' });
    expect(run('/about', 'en')).toEqual({ status: 307, location: '/en/about' });
  });

  it('ignores an invalid cookie value', () => {
    expect(run('/', 'de')).toEqual({ status: 307, location: '/is' });
  });

  it('preserves the query string', () => {
    expect(run('/?ink=bw&reprints=1')).toEqual({ status: 307, location: '/is?ink=bw&reprints=1' });
    expect(run('/about/press?x=1', 'en')).toEqual({ status: 307, location: '/en/about/press?x=1' });
  });

  it('normalises upper/mixed-case prefixes with 308', () => {
    expect(run('/IS/x')).toEqual({ status: 308, location: '/is/x' });
    expect(run('/En')).toEqual({ status: 308, location: '/en' });
    expect(run('/EN/about?ink=color')).toEqual({ status: 308, location: '/en/about?ink=color' });
  });

  it('passes through requests that already have a valid prefix', () => {
    for (const path of ['/is', '/en', '/is/x', '/en/about/press?ink=bw']) {
      expect(run(path, 'en').location).toBeNull();
    }
  });

  it('excludes Next internals and files with an extension from the matcher', () => {
    const [pattern] = config.matcher;
    const re = new RegExp(`^${pattern}$`);
    for (const path of [
      '/_next/static/x.js',
      '/_next/image',
      '/_vercel/insights',
      '/press/a.pdf',
      '/icon.svg',
    ]) {
      expect(re.test(path)).toBe(false);
    }
    for (const path of ['/', '/about', '/IS/x', '/en/works/hraun-vid-sjo']) {
      expect(re.test(path)).toBe(true);
    }
  });
});
