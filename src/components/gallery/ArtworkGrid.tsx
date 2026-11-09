// No 'use client' — rendered both as the server Suspense fallback and inside the client Gallery.
import type { GalleryItem } from '@/data/schema/artwork';
import type { Locale } from '@/lib/i18n/config';
import { ArtworkCard } from './ArtworkCard';

const EAGER_COUNT = 4; // first row on desktop
const MOBILE_FIRST_ROW = 2;

/**
 * Appendix B allows one high-priority image. Columns are equal width, so the LCP candidate is the
 * tallest work (largest height/width) in the first row of the 2-column mobile layout.
 */
export function lcpIndex(items: readonly Pick<GalleryItem, 'image'>[]): number {
  const aspects = items.slice(0, MOBILE_FIRST_ROW).map(({ image }) => image.height / image.width);
  return aspects.reduce((best, aspect, i, all) => (aspect > (all[best] ?? 0) ? i : best), 0);
}

export function ArtworkGrid({
  items,
  locale,
  query,
}: {
  items: GalleryItem[];
  locale: Locale;
  query: string;
}) {
  const priorityIndex = lcpIndex(items);
  return (
    <ul className="grid grid-cols-2 items-start gap-x-gutter gap-y-stack md:grid-cols-3 xl:grid-cols-4">
      {items.map((item, i) => (
        <li key={item.id}>
          <ArtworkCard
            item={item}
            locale={locale}
            query={query}
            eager={i < EAGER_COUNT}
            priority={i === priorityIndex}
          />
        </li>
      ))}
    </ul>
  );
}
