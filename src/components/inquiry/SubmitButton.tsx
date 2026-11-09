'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="min-w-40 bg-ink px-6 py-3 text-caption tracking-[0.14em] text-canvas uppercase transition-opacity hover:opacity-90 disabled:cursor-progress disabled:opacity-60"
    >
      <span aria-live="polite">{pending ? pendingLabel : label}</span>
    </button>
  );
}
