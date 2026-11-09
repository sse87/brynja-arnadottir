import type { Dictionary } from '@/data/schema/dictionary';
import type { Locale } from '@/lib/i18n/config';
import { formatPartialDate } from '@/lib/i18n/format';
import { getSite } from '@/lib/data/site';

export function Hero({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { artist } = getSite();

  return (
    <section className="mx-auto max-w-wide px-gutter py-section">
      <p className="text-eyebrow text-ink-subtle uppercase">{dict.hero.eyebrow}</p>
      <h1 className="mt-4 font-serif text-display">{artist.name}</h1>
      <p className="mt-3 text-caption text-ink-muted tabular-nums">
        <time dateTime={artist.born}>{formatPartialDate(artist.born, locale)}</time>
        {'–'}
        <time dateTime={artist.died}>{formatPartialDate(artist.died, locale)}</time>
      </p>
      <p className="mt-6 max-w-prose-archive font-serif text-lede text-ink-muted">
        {dict.hero.tagline}
      </p>
    </section>
  );
}
