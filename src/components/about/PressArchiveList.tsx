import Image from 'next/image';
import type { PressItem } from '@/data/schema/about';
import type { Dictionary } from '@/data/schema/dictionary';
import type { Locale } from '@/lib/i18n/config';
import { formatPartialDate } from '@/lib/i18n/format';
import { localize } from '@/lib/i18n/localize';
import {
  YEAR_NAV_THRESHOLD,
  pressFileMeta,
  pressLinkLabel,
  translationFor,
  yearAnchors,
} from '@/lib/about/press';

/** Server-only. `items` must already be sorted newest first (getPressItems()). */
export function PressArchiveList({
  items,
  locale,
  dict,
}: {
  items: readonly PressItem[];
  locale: Locale;
  dict: Dictionary;
}) {
  const t = dict.about.press;
  const copy = { press: t, footer: dict.footer };
  const anchors = yearAnchors(items);

  return (
    <>
      {items.length > YEAR_NAV_THRESHOLD && (
        <nav aria-label={t.jumpToYear} className="mb-6">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption tabular-nums">
            {[...anchors.values()].map((anchor) => (
              <li key={anchor}>
                <a href={`#${anchor}`} className="underline decoration-1 underline-offset-4">
                  {anchor.slice(1)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <ul className="divide-y divide-rule border-y border-rule">
        {items.map((item) => {
          const translation = translationFor(item, locale);
          const summary = item.summary && localize(item.summary, locale);
          const eyebrow = [item.publication, item.page && `${t.page} ${item.page}`]
            .filter(Boolean)
            .join(' · ');

          return (
            <li
              key={item.id}
              id={anchors.get(item.id)}
              data-press={item.id}
              className="grid scroll-mt-24 gap-x-gutter gap-y-2 py-6 md:grid-cols-[9rem_1fr_auto]"
            >
              <time
                dateTime={item.publishedAt}
                className="text-caption text-ink-muted tabular-nums"
              >
                {formatPartialDate(item.publishedAt, locale)}
              </time>

              <div className="min-w-0">
                <p className="text-eyebrow text-ink-subtle uppercase">{eyebrow}</p>
                <h2 className="mt-1 font-serif text-lede">
                  <span
                    lang={item.headlineLanguage === 'other' ? undefined : item.headlineLanguage}
                  >
                    {item.headline}
                  </span>
                </h2>
                {translation && (
                  <p className="mt-1 text-caption text-ink-muted">
                    <span className="sr-only">{t.translatedHeadline}: </span>
                    <span lang={locale}>{translation}</span>
                  </p>
                )}
                {summary && <p className="mt-2 text-caption text-ink-muted">{summary}</p>}
              </div>

              <div className="flex items-start gap-3 md:flex-col md:items-end md:text-right">
                {item.asset.kind === 'image' && (
                  <Image
                    src={item.asset.href}
                    alt=""
                    width={64}
                    height={Math.round((64 * item.asset.height) / item.asset.width)}
                    sizes="64px"
                    quality={70}
                    className="w-16 bg-mat ring-1 ring-rule"
                  />
                )}
                <div>
                  <a
                    href={item.asset.href}
                    target="_blank"
                    rel="noopener"
                    aria-label={pressLinkLabel(item, locale, copy)}
                    className="text-caption underline decoration-1 underline-offset-4 hover:decoration-2"
                  >
                    {t.open} <span aria-hidden>↗</span>
                  </a>
                  <p className="mt-1 text-caption text-ink-subtle tabular-nums" data-press-file>
                    {pressFileMeta(item, locale, copy)}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
