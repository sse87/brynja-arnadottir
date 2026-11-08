'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { locales, LOCALE_COOKIE, type Locale } from '@/lib/i18n/config';
import { useI18n } from '@/components/providers/I18nProvider';

/** `/is/about/press` → `/en/about/press`. */
export function swapLocale(pathname: string, target: Locale): string {
  const segments = pathname.split('/');
  segments[1] = target;
  return segments.join('/') || `/${target}`;
}

/** Target URL: current path with the locale swapped, plus the current query (filters survive). */
export function toggleHref(pathname: string, target: Locale, query = ''): string {
  return `${swapLocale(pathname, target)}${query ? `?${query}` : ''}`;
}

function persist(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function useTarget(): Locale {
  const { locale } = useI18n();
  return locales.find((l) => l !== locale) as Locale;
}

function ToggleLink({ href, target }: { href: string; target: Locale }) {
  const { messages } = useI18n();
  return (
    <Link
      href={href}
      hrefLang={target}
      lang={target}
      scroll={false}
      onClick={() => persist(target)}
      aria-label={messages.languageToggle.ariaLabel}
      className="text-caption tracking-[0.14em] text-ink-muted uppercase underline-offset-4 transition-colors hover:text-ink hover:underline"
    >
      {messages.languageToggle.label}
    </Link>
  );
}

/** Preserves the query string. Reads `useSearchParams()`, so it must sit inside `<Suspense>`. */
export function LanguageToggle() {
  const target = useTarget();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <ToggleLink href={toggleHref(pathname, target, searchParams.toString())} target={target} />
  );
}

/** Suspense fallback / static render: same link without the query string. */
export function LanguageToggleStatic() {
  const target = useTarget();
  const pathname = usePathname();
  return <ToggleLink href={toggleHref(pathname, target)} target={target} />;
}
