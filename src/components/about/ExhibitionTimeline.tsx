import Link from 'next/link';
import type { Exhibition } from '@/data/schema/about';
import type { Dictionary } from '@/data/schema/dictionary';
import type { Locale } from '@/lib/i18n/config';
import { formatPartialDate } from '@/lib/i18n/format';
import { localize } from '@/lib/i18n/localize';
import { localizedPath } from '@/lib/i18n/route';
import { decadeLabel, groupByDecade } from '@/lib/about/timeline';

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
            {list.map((e) => (
              <li
                key={e.id}
                id={e.id}
                data-exhibition={e.id}
                className="relative scroll-mt-24 before:absolute before:top-2 before:-left-[calc(1.5rem+3.5px)] before:size-1.75 before:rounded-full before:bg-ink"
              >
                <p className="text-caption text-ink-muted tabular-nums">
                  <time dateTime={e.date}>{formatPartialDate(e.date, locale)}</time>
                  {e.endDate && (
                    <>
                      {' – '}
                      <time dateTime={e.endDate}>{formatPartialDate(e.endDate, locale)}</time>
                    </>
                  )}
                </p>
                <h3 className="mt-1 font-serif text-lede">{localize(e.title, locale)}</h3>
                <p className="mt-1 text-caption text-ink-muted">
                  {localize(e.location.venue, locale)}, {localize(e.location.city, locale)} ·{' '}
                  {t[e.type]}
                </p>
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
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
