import type { Metadata } from 'next';
import { resolveLocale, alternatesFor, type LocaleParams } from '@/lib/i18n/route';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getAllArtworks, toGalleryItem } from '@/lib/data/artworks';

// Placeholder until Phase 4 replaces it with Hero + Gallery (SPEC §3.6).
export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { title: getDictionary(locale).gallery.heading, alternates: alternatesFor(locale) };
}

export default async function HomePage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const works = getAllArtworks().map((a) => toGalleryItem(a, locale));

  return (
    <section className="mx-auto max-w-wide px-gutter py-section">
      <p className="text-eyebrow text-ink-subtle uppercase">{dict.hero.eyebrow}</p>
      <h1 className="mt-4 font-serif text-display">{dict.meta.siteTitle}</h1>
      <p className="mt-6 max-w-prose-archive font-serif text-lede text-ink-muted">
        {dict.hero.tagline}
      </p>
      {/* Phase 3: renders loader output so `next build` parses artworks.json. */}
      <h2 className="mt-section font-serif text-title">{dict.gallery.heading}</h2>
      <ul className="mt-4 flex flex-col gap-1">
        {works.map((w) => (
          <li key={w.id}>{w.title}</li>
        ))}
      </ul>
    </section>
  );
}
