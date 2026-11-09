'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { GalleryItem } from '@/data/schema/artwork';
import {
  DEFAULT_FILTERS,
  facetCounts,
  filterItems,
  isDefaultFilters,
  parseFilters,
  serializeFilters,
  type GalleryFilters,
} from '@/lib/gallery/filters';
import { useI18n } from '@/components/providers/I18nProvider';
import { plural } from '@/lib/i18n/format';
import { GalleryFilters as Filters } from './GalleryFilters';
import { ArtworkGrid } from './ArtworkGrid';
import { EmptyState } from './EmptyState';

export function Gallery({ items }: { items: GalleryItem[] }) {
  const { locale, messages } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const query = useMemo(() => serializeFilters(filters), [filters]);
  const visible = useMemo(() => filterItems(items, filters), [items, filters]);
  const counts = useMemo(() => facetCounts(items, filters), [items, filters]);

  // replaceState: Next syncs native History API calls into useSearchParams() — no RSC round-trip,
  // no history entry per click.
  const update = useCallback(
    (patch: Partial<GalleryFilters>) => {
      const qs = serializeFilters({ ...filters, ...patch });
      window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
    },
    [filters, pathname],
  );

  return (
    <div className="flex flex-col gap-stack">
      <div className="flex flex-col gap-4 border-y border-rule py-4 md:flex-row md:items-center md:justify-between">
        <Filters filters={filters} counts={counts} onChange={update} />
        <p role="status" aria-live="polite" className="text-caption text-ink-muted tabular-nums">
          {plural(locale, visible.length, messages.gallery.resultCount)}
        </p>
      </div>

      {visible.length > 0 ? (
        <ArtworkGrid items={visible} locale={locale} query={query} />
      ) : (
        <EmptyState
          message={messages.gallery.empty}
          actionLabel={messages.gallery.reset}
          onReset={isDefaultFilters(filters) ? undefined : () => update(DEFAULT_FILTERS)}
        />
      )}
    </div>
  );
}
