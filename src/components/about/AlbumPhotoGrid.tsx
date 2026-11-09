'use client';

import Image from 'next/image';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '@/components/providers/I18nProvider';
import { interpolate } from '@/lib/i18n/format';
import { maxCoverWidth, noUpscaleSizes } from '@/lib/images/archival';

/** One photo, already localized on the server (keeps both languages out of the payload). */
export interface AlbumPhotoView {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  caption?: string;
  credit?: string;
  blurDataURL?: string;
}

const EAGER_THUMBNAILS = 4;

/**
 * Thumbnail grid + a lightweight native <dialog> (SPEC §5.5). No route interception: archival
 * photos don't need deep links. Every image is capped at its intrinsic size — never upscaled.
 */
export function AlbumPhotoGrid({ photos }: { photos: AlbumPhotoView[] }) {
  const { messages } = useI18n();
  const t = messages.about.albums;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const captionId = useId();

  const isOpen = openIndex !== null;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) dialog.showModal();
  }, [isOpen]);

  const last = photos.length - 1;
  const step = useCallback(
    (delta: -1 | 1) =>
      setOpenIndex((i) => (i === null ? i : Math.min(Math.max(i + delta, 0), last))),
    [last],
  );

  // On the document, not the dialog: when ←/→ disables the focused end button, focus can drop to
  // <body> and a dialog-level handler would stop hearing keys.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      step(e.key === 'ArrowLeft' ? -1 : 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, step]);

  const photo = openIndex === null ? undefined : photos[openIndex];
  const hasPrev = openIndex !== null && openIndex > 0;
  const hasNext = openIndex !== null && openIndex < last;

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          // content-visibility sits on the image wrapper, not the <li>: its paint containment
          // would clip the button's outset focus ring.
          <li key={p.id}>
            <button
              ref={(el) => {
                thumbRefs.current[i] = el;
              }}
              type="button"
              data-album-photo={p.id}
              onClick={() => setOpenIndex(i)}
              className="block w-full cursor-zoom-in focus-visible:outline-offset-4"
            >
              <span className="block [contain-intrinsic-size:auto_220px] [content-visibility:auto]">
                <Image
                  src={p.src}
                  alt={p.alt}
                  width={p.width}
                  height={p.height}
                  sizes="(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 50vw"
                  quality={70}
                  loading={i < EAGER_THUMBNAILS ? 'eager' : 'lazy'}
                  placeholder={p.blurDataURL ? 'blur' : 'empty'}
                  blurDataURL={p.blurDataURL}
                  style={{ maxWidth: maxCoverWidth(p.width, p.height) }}
                  className="aspect-4/3 h-auto w-full bg-mat object-cover"
                />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-labelledby={photo?.caption ? captionId : undefined}
        aria-label={photo?.caption ? undefined : photo?.alt}
        onClose={() => {
          // Return focus to the thumbnail of the photo shown last (not the one first opened).
          const shown = openIndex;
          setOpenIndex(null);
          if (shown !== null) thumbRefs.current[shown]?.focus();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-mat p-0 text-mat-ink backdrop:bg-scrim open:animate-fade-in"
      >
        {photo && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2 px-3 pt-3">
              <p className="px-2 text-caption tabular-nums" aria-live="polite">
                {interpolate(t.photoOf, { index: (openIndex ?? 0) + 1, total: photos.length })}
              </p>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label={t.close}
                className="grid size-11 place-items-center"
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

            <figure className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-gutter pb-4">
              <div className="flex min-h-0 w-full flex-1 items-center justify-center gap-2">
                <NavButton
                  label={t.previous}
                  disabled={!hasPrev}
                  onClick={() => step(-1)}
                  dir="prev"
                />
                <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center self-stretch">
                  <Image
                    key={photo.id}
                    src={photo.src}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    sizes={noUpscaleSizes(photo.width)}
                    quality={75}
                    placeholder={photo.blurDataURL ? 'blur' : 'empty'}
                    blurDataURL={photo.blurDataURL}
                    // Never displayed larger than the archival original (SPEC §5.5): the box is at
                    // most `width` wide, and object-contain keeps the pixels inside the box.
                    style={{ maxWidth: photo.width }}
                    className="h-auto max-h-[calc(100dvh-9rem)] w-full object-contain"
                  />
                </div>
                <NavButton label={t.next} disabled={!hasNext} onClick={() => step(1)} dir="next" />
              </div>
              {(photo.caption || photo.credit) && (
                <figcaption className="max-w-prose-archive text-center text-caption">
                  {photo.caption && <span id={captionId}>{photo.caption}</span>}
                  {photo.credit && <span className="block text-mat-ink/70">{photo.credit}</span>}
                </figcaption>
              )}
            </figure>
          </div>
        )}
      </dialog>
    </>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  dir,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  dir: 'prev' | 'next';
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-11 shrink-0 place-items-center disabled:opacity-30"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d={dir === 'prev' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  );
}
