'use client';

import Link from 'next/link';
import { useI18n } from '@/components/providers/I18nProvider';
import { localizedPath } from '@/lib/i18n/route';

// not-found.tsx receives no props, so locale + copy come from the [locale] layout's I18nProvider.
export default function NotFound() {
  const { locale, messages } = useI18n();
  const t = messages.notFound;

  return (
    <div className="mx-auto max-w-wide px-gutter py-section">
      <title>{t.title}</title>
      <p className="text-eyebrow text-ink-subtle uppercase tabular-nums">404</p>
      <h1 className="mt-3 font-serif text-title">{t.title}</h1>
      <p className="mt-4 max-w-prose-archive text-body text-ink-muted">{t.body}</p>
      <Link
        href={localizedPath(locale)}
        className="mt-8 inline-block text-caption underline decoration-1 underline-offset-4 hover:decoration-2"
      >
        {t.home}
      </Link>
    </div>
  );
}
