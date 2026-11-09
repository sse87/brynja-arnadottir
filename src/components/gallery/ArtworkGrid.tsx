// No 'use client' — rendered both as the server Suspense fallback and inside the client Gallery.
import type { GalleryItem } from '@/data/schema/artwork';
import type { Locale } from '@/lib/i18n/config';
import { ArtworkCard } from './ArtworkCard';

const EAGER_COUNT = 4; // first row on desktop

export function ArtworkGrid({
  items,
  locale,
  query,
}: {
  items: GalleryItem[];
  locale: Locale;
  query: string;
}) {
  return (
    <ul className="grid grid-cols-2 items-start gap-x-gutter gap-y-stack md:grid-cols-3 xl:grid-cols-4">
      {items.map((item, i) => (
        <li key={item.id}>
          <ArtworkCard item={item} locale={locale} query={query} eager={i < EAGER_COUNT} />
        </li>
      ))}
    </ul>
  );
}
