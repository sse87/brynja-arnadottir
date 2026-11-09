import { Suspense } from 'react';
import type { Metadata } from 'next';
import { resolveLocale, alternatesFor, type LocaleParams } from '@/lib/i18n/route';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { openGraphFor } from '@/lib/seo/metadata';
import { getAllArtworks, toGalleryItem } from '@/lib/data/artworks';
import { Hero } from '@/components/home/Hero';
import { Gallery } from '@/components/gallery/Gallery';
import { ArtworkGrid } from '@/components/gallery/ArtworkGrid';

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  return {
    title: dict.gallery.heading,
    description: dict.meta.siteDescription,
    alternates: alternatesFor(locale),
    openGraph: openGraphFor(locale, dict.meta.siteTitle, '', { title: dict.gallery.heading }),
  };
}

export default async function HomePage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const items = getAllArtworks().map((a) => toGalleryItem(a, locale));

  return (
    <>
      <Hero locale={locale} dict={dict} />
      <section
        aria-labelledby="works-heading"
        className="mx-auto max-w-gallery px-gutter pb-section"
      >
        <h2 id="works-heading" className="sr-only">
          {dict.gallery.heading}
        </h2>
        {/* Gallery reads useSearchParams(), so the static HTML is this unfiltered server grid:
            crawlers and first paint get every artwork; filters hydrate on top (SPEC §3.6). */}
        <Suspense fallback={<ArtworkGrid items={items} locale={locale} query="" />}>
          <Gallery items={items} />
        </Suspense>
      </section>
    </>
  );
}
