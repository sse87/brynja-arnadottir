import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/lib/i18n/config';
import { resolveLocale, alternatesFor, localizedPath } from '@/lib/i18n/route';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { localize } from '@/lib/i18n/localize';
import { formatArtworkYear } from '@/lib/i18n/format';
import { getAllArtworks, getArtworkBySlug } from '@/lib/data/artworks';
import { getSite } from '@/lib/data/site';
import { bunnyTransform } from '@/lib/images/cdn';
import type { Artwork } from '@/data/schema/artwork';
import { ArtworkDetailView } from '@/components/artwork/ArtworkDetailView';

type Params = Promise<{ locale: string; slug: string }>;

export function generateStaticParams() {
  return locales.flatMap((locale) => getAllArtworks().map((a) => ({ locale, slug: a.slug })));
}

async function load(params: Params): Promise<{ locale: Locale; artwork: Artwork }> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const artwork = getArtworkBySlug(slug);
  if (!artwork) notFound();
  return { locale, artwork };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, artwork } = await load(params);
  const t = getDictionary(locale).lightbox;
  const title = localize(artwork.title, locale);
  return {
    title,
    description: `${localize(artwork.medium, locale)}, ${formatArtworkYear(artwork.year, artwork.yearCirca, t)}`,
    alternates: alternatesFor(locale, `/works/${artwork.slug}`),
    openGraph: {
      title,
      images: [
        {
          url: bunnyTransform(artwork.image.src, { width: 1200 }),
          alt: localize(artwork.image.alt, locale),
        },
      ],
    },
  };
}

function visualArtworkJsonLd(artwork: Artwork, locale: Locale) {
  const cm = (value: number) => ({ '@type': 'Distance', name: `${value} cm` });
  return {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: localize(artwork.title, locale),
    image: bunnyTransform(artwork.image.src, { width: 1200 }),
    ...(artwork.year !== null && { dateCreated: String(artwork.year) }),
    artMedium: localize(artwork.medium, locale),
    artform: 'Drawing',
    width: cm(artwork.dimensions.widthCm),
    height: cm(artwork.dimensions.heightCm),
    creator: { '@type': 'Person', name: getSite().artist.name },
    inLanguage: locale,
  };
}

export default async function ArtworkPage({ params }: { params: Params }) {
  const { locale, artwork } = await load(params);
  const dict = getDictionary(locale);
  const ink = artwork.styleCategory === 'black-and-white' ? 'mono' : 'color';

  return (
    <article data-ink={ink}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(visualArtworkJsonLd(artwork, locale)).replace(/</g, '\\u003c'),
        }}
      />
      <div className="mx-auto max-w-gallery px-gutter py-4">
        <Link
          href={localizedPath(locale)}
          className="text-caption underline decoration-1 underline-offset-4 hover:decoration-2"
        >
          <span aria-hidden>← </span>
          {dict.nav.works}
        </Link>
      </div>
      <ArtworkDetailView artwork={artwork} locale={locale} variant="page" />
    </article>
  );
}
