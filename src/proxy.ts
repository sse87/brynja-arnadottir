import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, isLocale, LOCALE_COOKIE } from '@/lib/i18n/config';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, first = ''] = pathname.split('/');

  if (isLocale(first)) return NextResponse.next();

  const url = request.nextUrl.clone();

  // Case normalisation: /IS/... → /is/...
  const lower = first.toLowerCase();
  if (isLocale(lower)) {
    url.pathname = pathname.replace(`/${first}`, `/${lower}`);
    return NextResponse.redirect(url, 308);
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|_vercel|.*\\..*).*)'],
};
