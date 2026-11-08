import Link from 'next/link';
import { Suspense } from 'react';
import { LanguageToggle, LanguageToggleStatic } from './LanguageToggle';
import { NavLinks } from './NavLinks';
import { localizedPath } from '@/lib/i18n/route';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/data/schema/dictionary';

export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-canvas/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-wide items-center justify-between gap-gutter px-gutter">
        <Link href={localizedPath(locale)} className="font-serif text-lede tracking-tight">
          {dict.meta.siteTitle}
        </Link>
        <nav aria-label={dict.nav.primary} className="flex items-center gap-6">
          <NavLinks
            items={[
              { href: localizedPath(locale), label: dict.nav.works, match: 'exact' },
              { href: localizedPath(locale, '/about'), label: dict.nav.about, match: 'prefix' },
            ]}
          />
          <span aria-hidden className="h-4 w-px bg-rule-strong" />
          <Suspense fallback={<LanguageToggleStatic />}>
            <LanguageToggle />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
