'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { NavIndexEntry } from '@/data/schema/artwork';
import { useI18n } from '@/components/providers/I18nProvider';
import { LightboxNav } from './LightboxNav';
import { cn } from '@/lib/cn';

type Mat = 'auto' | 'light' | 'dark';

interface Props {
  slug: string;
  ink: 'mono' | 'color';
  titleId: string;
  navIndex: NavIndexEntry[];
  fullPageHref: string;
  children: React.ReactNode;
}

/** Elements marked with this attribute count as backdrop: clicking them closes the lightbox. */
export const BACKDROP_ATTR = 'data-lightbox-backdrop';

export function LightboxDialog({ slug, ink, titleId, navIndex, fullPageHref, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { messages } = useI18n();
  const t = messages.lightbox;
  const [mat, setMat] = useState<Mat>('auto');

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      // Restore focus to the card of the work shown last. While another lightbox is open (prev/next
      // remounts this component) the grid is inert, so this is a no-op until the final close.
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(`[data-artwork-card="${slug}"] a`)
          ?.focus({ preventScroll: true });
      });
    };
  }, [slug]);

  const close = useCallback(() => router.back(), [router]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      data-ink={ink}
      data-mat={mat === 'auto' ? undefined : mat}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        // The dialog fills the viewport, so the native ::backdrop is never hit. The mat around the
        // artwork (marked with BACKDROP_ATTR) plays that role instead.
        const target = e.target as HTMLElement;
        if (target === e.currentTarget || target.hasAttribute(BACKDROP_ATTR)) close();
      }}
      className={cn(
        'fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden p-0',
        'bg-mat text-mat-ink backdrop:bg-scrim open:animate-fade-in',
      )}
    >
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 lg:right-[calc(26rem+0.75rem)]">
        <div
          role="group"
          aria-label={t.mat.label}
          className="hidden items-center gap-1 text-caption sm:flex"
        >
          {(['light', 'dark'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mat === m}
              onClick={() => setMat((cur) => (cur === m ? 'auto' : m))}
              className="px-2 py-1 text-mat-ink/70 aria-pressed:text-mat-ink aria-pressed:underline"
            >
              {t.mat[m]}
            </button>
          ))}
        </div>
        {/* Plain <a>: a soft <Link> to this URL would be intercepted again and stay in the modal. */}
        <a href={fullPageHref} className="sr-only focus:not-sr-only focus:px-2 focus:py-1">
          {t.openFullPage}
        </a>
        <button
          type="button"
          onClick={close}
          aria-label={t.close}
          className="grid size-11 place-items-center text-mat-ink"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </button>
      </div>

      {/* useSearchParams() in a prerendered route must sit under a Suspense boundary. */}
      <Suspense fallback={null}>
        <LightboxNav currentSlug={slug} index={navIndex} />
      </Suspense>
      {children}
    </dialog>
  );
}
