'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { sendInquiry } from '@/app/actions/sendInquiry';
import {
  INITIAL_INQUIRY_STATE,
  STARTED_AT_UNSTAMPED,
  type InquiryState,
} from '@/data/schema/inquiry';
import { useI18n } from '@/components/providers/I18nProvider';
import { ReprintInquiryForm } from '@/components/inquiry/ReprintInquiryForm';
import { clsx } from 'clsx';

const SECTION_ID = 'reprint-inquiry';

/**
 * CTA ↔ inquiry form. Works without JavaScript (SPEC §4.6):
 * - The form is always server-rendered. Until opened it is `hidden`, and the CTA is a
 *   `#reprint-inquiry` link, so `:target` reveals it with no JS.
 * - `useActionState` lives here, not in the form, so the response to a no-JS POST renders
 *   the form view with the returned errors / success.
 */
export function ReprintPanel({
  artworkId,
  artworkTitle,
  pageHref,
}: {
  artworkId: string;
  artworkTitle: string;
  pageHref: string;
}) {
  const { messages } = useI18n();
  const [state, formAction] = useActionState(sendInquiry, INITIAL_INQUIRY_STATE);
  const [view, setView] = useState<'cta' | 'form'>('cta');
  // Deterministic until the CTA click stamps it, so SSR and hydration agree.
  const [startedAt, setStartedAt] = useState(STARTED_AT_UNSTAMPED);
  // `useActionState` can't be reset: "Back" marks the current result as dismissed instead.
  const [dismissed, setDismissed] = useState<InquiryState | null>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returning = useRef(false);

  const current = state === dismissed ? INITIAL_INQUIRY_STATE : state;
  const showForm = view === 'form' || current.status !== 'idle';

  // Focus the form heading on open; refocus the CTA only when coming back — never on first mount.
  useEffect(() => {
    if (view === 'form') {
      returning.current = true;
      headingRef.current?.focus({ preventScroll: true });
    } else if (returning.current) {
      returning.current = false;
      ctaRef.current?.focus({ preventScroll: true });
    }
  }, [view]);

  function open(e: React.MouseEvent) {
    e.preventDefault();
    setStartedAt(Date.now());
    setView('form');
  }

  function back() {
    // A hash from a pre-hydration click would keep the form visible via `:target`.
    if (window.location.hash === `#${SECTION_ID}`) {
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search,
      );
    }
    setDismissed(state);
    setView('cta');
  }

  return (
    <div className="mt-8">
      <section
        id={SECTION_ID}
        className={clsx('peer', showForm ? 'animate-fade-in' : 'hidden target:block')}
      >
        <ReprintInquiryForm
          artworkId={artworkId}
          artworkTitle={artworkTitle}
          state={current}
          formAction={formAction}
          startedAt={startedAt}
          headingRef={headingRef}
          onBack={back}
          backHref={pageHref}
        />
      </section>

      {!showForm && (
        <div className="peer-target:hidden">
          <p className="flex items-center gap-2 text-caption">
            <span aria-hidden className="size-1.5 rounded-full bg-ink" />
            {messages.lightbox.reprintAvailable}
          </p>
          <a
            ref={ctaRef}
            href={`#${SECTION_ID}`}
            aria-expanded={false}
            aria-controls={SECTION_ID}
            onClick={open}
            className="mt-4 block w-full bg-ink px-6 py-3.5 text-center text-caption tracking-[0.14em] text-canvas uppercase transition-opacity hover:opacity-90"
          >
            {messages.lightbox.buyReprint}
          </a>
        </div>
      )}
    </div>
  );
}
