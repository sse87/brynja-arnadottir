// Temporary design-token smoke page until Phase 2 adds the localized routes (SPEC §1).
// Proper nouns only — no UI copy (SPEC §0.4.4).
export default function Page() {
  return (
    <main className="mx-auto flex max-w-wide flex-col gap-stack px-gutter py-section">
      <p className="text-eyebrow text-ink-subtle uppercase">ART-0001</p>
      <h1 className="font-serif text-display">Brynja Árnadóttir</h1>
      <p className="text-caption text-ink-muted tabular-nums">1942–2025</p>
      <div className="grid grid-cols-2 gap-gutter border-t border-rule pt-stack">
        <div data-ink="mono" className="aspect-[4/3] bg-mat ring-1 ring-rule" />
        <div data-ink="color" className="aspect-[4/3] bg-mat" />
      </div>
    </main>
  );
}
