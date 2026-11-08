export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href="#main"
      className="sr-only z-50 bg-ink px-4 py-2 text-caption text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      {label}
    </a>
  );
}
