import Image from 'next/image';
import type { Artwork } from '@/data/schema/artwork';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { localize } from '@/lib/i18n/localize';
import { formatArtworkYear, formatDimensions } from '@/lib/i18n/format';
import { ReprintPanel } from './ReprintPanel';
import { cn } from '@/lib/cn';

/** Server Component shared by the lightbox (`modal`) and the full work page (`page`). */
export function ArtworkDetailView({
  artwork,
  locale,
  variant,
}: {
  artwork: Artwork;
  locale: Locale;
  variant: 'modal' | 'page';
}) {
  const t = getDictionary(locale).lightbox;
  const title = localize(artwork.title, locale);
  const modal = variant === 'modal';
  // The image is height-capped (60dvh <lg, 100dvh − 6rem ≥lg), so a portrait work renders narrower
  // than its column. Tell the browser, so a phone fetches ~640w instead of 828w at the same
  // quality. A browser without min() in `sizes` drops both entries and falls back to 100vw.
  const ratio = (artwork.image.width / artwork.image.height).toFixed(3);
  const sizes = `(min-width: 1024px) min(calc(100vw - 26rem), calc((100vh - 6rem) * ${ratio})), min(100vw, calc(60vh * ${ratio}))`;

  return (
    <div
      className={cn(
        'grid lg:grid-cols-[1fr_26rem]',
        modal
          ? 'h-dvh grid-rows-[auto_minmax(0,1fr)] lg:grid-rows-1'
          : 'min-h-[calc(100dvh-var(--header-h))]',
      )}
    >
      <div
        // In the lightbox, the mat around the artwork acts as the backdrop (click closes).
        data-lightbox-backdrop={modal ? '' : undefined}
        className="flex min-h-0 items-center justify-center bg-mat p-gutter lg:p-12"
      >
        <Image
          src={artwork.image.src}
          alt={localize(artwork.image.alt, locale)}
          width={artwork.image.width}
          height={artwork.image.height}
          sizes={sizes}
          quality={90}
          placeholder={artwork.image.blurDataURL ? 'blur' : 'empty'}
          blurDataURL={artwork.image.blurDataURL}
          loading="eager"
          fetchPriority="high"
          className="h-auto max-h-[60dvh] w-auto max-w-full object-contain lg:max-h-[calc(100dvh-6rem)]"
        />
      </div>

      {/* Not <aside>: this panel holds the page's h1, so it isn't complementary content. */}
      <div
        data-details-panel
        className={cn(
          'overflow-y-auto border-t border-rule bg-surface p-gutter text-ink lg:border-t-0 lg:border-l lg:p-10',
          // Clears the fixed mobile prev/next bar, also when focus scrolls a field into view (2.4.11).
          modal && 'scroll-pb-16 pb-20 lg:scroll-pb-0 lg:pb-10',
        )}
      >
        <p className="text-eyebrow text-ink-subtle uppercase">{artwork.id}</p>
        <h1 id="artwork-title" className="mt-2 font-serif text-title">
          {title}
        </h1>
        <p className="mt-1 text-caption text-ink-muted tabular-nums">
          {formatArtworkYear(artwork.year, artwork.yearCirca, t)}
        </p>

        <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 border-y border-rule py-6 text-caption">
          <dt className="text-ink-subtle">{t.medium}</dt>
          <dd>{localize(artwork.medium, locale)}</dd>
          <dt className="text-ink-subtle">{t.dimensions}</dt>
          <dd className="tabular-nums">
            {formatDimensions(artwork.dimensions.widthCm, artwork.dimensions.heightCm, locale)}
          </dd>
          <dt className="text-ink-subtle">{t.catalogueId}</dt>
          <dd className="tabular-nums">{artwork.id}</dd>
        </dl>

        {artwork.description && (
          <p className="mt-6 text-body text-ink-muted">{localize(artwork.description, locale)}</p>
        )}

        {artwork['available-as-reprint'] && (
          <ReprintPanel
            artworkId={artwork.id}
            artworkTitle={title}
            pageHref={`/${locale}/works/${artwork.slug}`}
          />
        )}
      </div>
    </div>
  );
}
