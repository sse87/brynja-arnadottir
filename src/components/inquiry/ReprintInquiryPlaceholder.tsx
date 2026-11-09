'use client';

import { useEffect, useRef } from 'react';
import { useI18n } from '@/components/providers/I18nProvider';

/**
 * Phase 5 stand-in for ReprintInquiryForm (SPEC §4.6). Same props, so Phase 6 swaps the import
 * in ReprintPanel and deletes this file.
 */
export function ReprintInquiryPlaceholder({
  artworkTitle,
  onBack,
}: {
  artworkId: string;
  artworkTitle: string;
  onBack: () => void;
}) {
  const { messages } = useI18n();
  const t = messages.inquiry;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => headingRef.current?.focus({ preventScroll: true }), []);

  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1} className="font-serif text-title outline-none">
        {t.heading}
      </h2>
      <p className="mt-2 text-caption text-ink-muted">
        {t.regarding}: <span className="text-ink">{artworkTitle}</span>
      </p>
      <p className="mt-4 text-body text-ink-muted">{t.intro}</p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 text-caption underline decoration-1 underline-offset-4 hover:decoration-2"
      >
        {t.back}
      </button>
    </div>
  );
}
