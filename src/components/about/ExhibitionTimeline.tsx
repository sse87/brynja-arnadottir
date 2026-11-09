import Link from 'next/link';
import type { Exhibition } from '@/data/schema/about';
import type { Dictionary } from '@/data/schema/dictionary';
import type { Locale } from '@/lib/i18n/config';
import { countryName } from '@/lib/i18n/format';
import { localize } from '@/lib/i18n/localize';
import { localizedPath } from '@/lib/i18n/route';
import { decadeLabel, formatExhibitionDate, groupByDecade } from '@/lib/about/timeline';

/** Server-only, zero JS. `items` must already be sorted ascending (getExhibitions()). */
export function ExhibitionTimeline({
  items,
  locale,
  dict,
}: {
  items: readonly Exhibition[];
  locale: Locale;
  dict: Dictionary;
}) {
  const t = dict.about.exhibitions;
  // Venue and city are Icelandic in every locale (verbatim from the old site).
  const venueLang = locale === 'is' ? undefined : 'is';

  return (
    <div className="flex flex-col">
      {groupByDecade(items).map(([decade, list]) => (
        <section
          key={decade}
          aria-labelledby={`decade-${decade}`}
          className="grid gap-x-gutter border-t border-rule py-stack md:grid-cols-[10rem_1fr]"
        >
          <h2
            id={`decade-${decade}`}
            className="font-serif text-title tabular-nums md:sticky md:top-24 md:self-start"
          >
            {decadeLabel(decade)}
          </h2>
          <ol className="relative mt-6 flex flex-col gap-8 border-l border-rule pl-6 md:mt-0">
            {list.map((e) => {
              const { venue, city, countryCode } = e.location;
              const place = [e.title ? venue : undefined, city].filter(Boolean).join(', ');
              const country = countryCode === 'IS' ? undefined : countryName(countryCode, locale);
              return (
                <li
                  key={e.id}
                  id={e.id}
                  data-exhibition={e.id}
                  data-exhibition-type={e.type}
                  className="relative scroll-mt-24 before:absolute before:top-2 before:-left-[calc(1.5rem+3.5px)] before:size-1.75 before:rounded-full before:bg-ink"
                >
                  <p className="text-caption text-ink-muted tabular-nums">
                    <time dateTime={e.date}>{formatExhibitionDate(e, locale, t.seasons)}</time>
                  </p>
                  <h3 className="mt-1 font-serif text-lede">
                    {e.title ? localize(e.title, locale) : <span lang={venueLang}>{venue}</span>}
                  </h3>
                  {(place || country) && (
                    <p className="mt-1 text-caption text-ink-muted" data-exhibition-place>
                      {place && <span lang={venueLang}>{place}</span>}
                      {place && country && ', '}
                      {country}
                    </p>
                  )}
                  {e.type === 'group' && (
                    <p className="mt-2">
                      <span
                        data-exhibition-tag
                        className="inline-block border border-rule px-1.5 text-eyebrow text-ink-subtle uppercase"
                      >
                        {t.group}
                      </span>
                    </p>
                  )}
                  {e.albumId && (
                    <Link
                      href={localizedPath(locale, `/about/albums/${e.albumId}`)}
                      className="mt-2 inline-block text-caption underline decoration-1 underline-offset-4 hover:decoration-2"
                    >
                      <span aria-hidden>→ </span>
                      {t.photoAlbum}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
