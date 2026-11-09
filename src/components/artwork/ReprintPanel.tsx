'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/components/providers/I18nProvider';
// Phase 6 swaps this for ReprintInquiryForm (same props).
import { ReprintInquiryPlaceholder as ReprintInquiryForm } from '@/components/inquiry/ReprintInquiryPlaceholder';

export function ReprintPanel({
  artworkId,
  artworkTitle,
}: {
  artworkId: string;
  artworkTitle: string;
}) {
  const { messages } = useI18n();
  const [view, setView] = useState<'cta' | 'form'>('cta');
  const ctaRef = useRef<HTMLButtonElement>(null);
  const returning = useRef(false);

  // Refocus the CTA only when coming back from the form — never on first mount.
  useEffect(() => {
    if (view === 'form') returning.current = true;
    else if (returning.current) {
      returning.current = false;
      ctaRef.current?.focus({ preventScroll: true });
    }
  }, [view]);

  if (view === 'form') {
    return (
      <section id="reprint-inquiry" className="mt-8 animate-fade-in">
        <ReprintInquiryForm
          artworkId={artworkId}
          artworkTitle={artworkTitle}
          onBack={() => setView('cta')}
        />
      </section>
    );
  }

  return (
    <div className="mt-8">
      <p className="flex items-center gap-2 text-caption">
        <span aria-hidden className="size-1.5 rounded-full bg-ink" />
        {messages.lightbox.reprintAvailable}
      </p>
      <button
        ref={ctaRef}
        type="button"
        aria-expanded={false}
        aria-controls="reprint-inquiry"
        onClick={() => setView('form')}
        className="mt-4 w-full bg-ink px-6 py-3.5 text-caption tracking-[0.14em] text-canvas uppercase transition-opacity hover:opacity-90"
      >
        {messages.lightbox.buyReprint}
      </button>
    </div>
  );
}
