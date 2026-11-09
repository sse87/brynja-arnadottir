'use client';

import { useI18n } from '@/components/providers/I18nProvider';

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { messages } = useI18n();
  const t = messages.error;

  return (
    <div className="mx-auto max-w-wide px-gutter py-section">
      {/* Alert on the message only, so the Retry button isn't read as part of it. */}
      <div role="alert">
        <h1 className="font-serif text-title">{t.title}</h1>
      </div>
      <button
        type="button"
        onClick={reset}
        className="mt-8 bg-ink px-6 py-3 text-caption tracking-[0.14em] text-canvas uppercase hover:opacity-90"
      >
        {t.retry}
      </button>
    </div>
  );
}
