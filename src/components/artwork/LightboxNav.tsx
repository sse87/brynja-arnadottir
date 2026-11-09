'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { NavIndexEntry } from '@/data/schema/artwork';
import { filterItems, parseFilters, serializeFilters } from '@/lib/gallery/filters';
import { useI18n } from '@/components/providers/I18nProvider';
import { clsx } from 'clsx';

type NavDirection = 'prev' | 'next';
let pendingFocus: NavDirection | null = null;

/**
 * Prev/next remounts the lightbox, and showModal() then focuses the first control in the dialog.
 * The control that was activated records itself here so the new dialog can hand focus back to it.
 */
export function takePendingNavFocus(): NavDirection | null {
  const dir = pendingFocus;
  pendingFocus = null;
  return dir;
}

export function LightboxNav({
  currentSlug,
  index,
}: {
  currentSlug: string;
  index: NavIndexEntry[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, messages } = useI18n();

  const { prevHref, nextHref } = useMemo(() => {
    const filters = parseFilters(searchParams);
    const filtered = filterItems(index, filters);
    // If the current work isn't in the filtered set (e.g. deep link), navigate the full set.
    const list = filtered.some((e) => e.slug === currentSlug) ? filtered : index;
    const i = list.findIndex((e) => e.slug === currentSlug);
    const n = list.length;
    const qs = serializeFilters(filters);
    const hrefFor = (slug: string) => `/${locale}/works/${slug}${qs ? `?${qs}` : ''}`;
    const prev = n > 1 ? list[(i - 1 + n) % n] : undefined;
    const next = n > 1 ? list[(i + 1) % n] : undefined;
    return {
      prevHref: prev && hrefFor(prev.slug),
      nextHref: next && hrefFor(next.slug),
    };
  }, [searchParams, index, currentSlug, locale]);

  useEffect(() => {
    if (prevHref) router.prefetch(prevHref);
    if (nextHref) router.prefetch(nextHref);
  }, [router, prevHref, nextHref]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      // Never hijack typing in a form field.
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'ArrowLeft' && prevHref) router.replace(prevHref, { scroll: false });
      if (e.key === 'ArrowRight' && nextHref) router.replace(nextHref, { scroll: false });
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, prevHref, nextHref]);

  if (!prevHref || !nextHref) return null;

  // <lg: fixed bottom bar; ≥lg: arrows centred on the image pane's edges.
  const btn =
    'z-10 grid size-12 place-items-center text-mat-ink/70 hover:text-mat-ink lg:absolute lg:top-1/2 lg:-translate-y-1/2';
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 flex justify-between border-t border-rule bg-mat lg:contents">
      <Link
        replace
        scroll={false}
        href={prevHref}
        data-nav="prev"
        onClick={() => (pendingFocus = 'prev')}
        aria-label={messages.lightbox.previous}
        className={clsx(btn, 'lg:left-2')}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
        >
          <path d="M15 4l-8 8 8 8" />
        </svg>
      </Link>
      <Link
        replace
        scroll={false}
        href={nextHref}
        data-nav="next"
        onClick={() => (pendingFocus = 'next')}
        aria-label={messages.lightbox.next}
        className={clsx(btn, 'lg:right-[calc(26rem+0.5rem)]')}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
        >
          <path d="M9 4l8 8-8 8" />
        </svg>
      </Link>
    </div>
  );
}
