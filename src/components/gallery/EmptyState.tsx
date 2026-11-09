// Rendered only inside the client <Gallery>, so `onReset` can be a function prop.
export function EmptyState({
  message,
  actionLabel,
  onReset,
}: {
  message: string;
  actionLabel: string;
  /** Omitted when filters are already at their defaults (nothing to reset). */
  onReset?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 border-y border-rule py-section text-center">
      <p className="max-w-prose-archive text-body text-ink-muted">{message}</p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="bg-ink px-6 py-3 text-caption tracking-[0.14em] text-canvas uppercase hover:opacity-90"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
