import { resolveLocale } from '@/lib/i18n/route';
import { getAllArtworks, getArtworkBySlug, getNavIndex } from '@/lib/data/artworks';
import { locales } from '@/lib/i18n/config';
import { LightboxDialog } from '@/components/artwork/LightboxDialog';
import { ArtworkDetailView } from '@/components/artwork/ArtworkDetailView';

export function generateStaticParams() {
  return locales.flatMap((locale) => getAllArtworks().map((a) => ({ locale, slug: a.slug })));
}

export default async function ArtworkModal({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const artwork = getArtworkBySlug(slug);
  if (!artwork) return null;

  return (
    <LightboxDialog
      slug={artwork.slug}
      ink={artwork.styleCategory === 'black-and-white' ? 'mono' : 'color'}
      titleId="artwork-title"
      navIndex={getNavIndex()}
      fullPageHref={`/${locale}/works/${artwork.slug}`}
    >
      <ArtworkDetailView artwork={artwork} locale={locale} variant="modal" />
    </LightboxDialog>
  );
}
