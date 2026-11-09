import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
import { resolveLocale, alternatesFor, localizedPath } from '@/lib/i18n/route';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { localize } from '@/lib/i18n/localize';
import { formatPartialDate, interpolate } from '@/lib/i18n/format';
import { getAlbum, getAlbums, getExhibitions } from '@/lib/data/about';
import { exhibitionLabel } from '@/lib/about/timeline';
import type { Album } from '@/data/schema/about';
import { AlbumPhotoGrid, type AlbumPhotoView } from '@/components/about/AlbumPhotoGrid';
import { openGraphFor } from '@/lib/seo/metadata';

type Params = Promise<{ locale: string; albumId: string }>;

// The root [locale] layout supplies `locale`.
export function generateStaticParams() {
  return getAlbums().map((a) => ({ albumId: a.id }));
}

async function load(params: Params): Promise<{ locale: Locale; album: Album }> {
  const locale = await resolveLocale(params);
  const { albumId } = await params;
  const album = getAlbum(albumId);
  if (!album) notFound();
  return { locale, album };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, album } = await load(params);
  const dict = getDictionary(locale);
  const title = localize(album.title, locale);
  const path = `/about/albums/${album.id}`;
  return {
    title,
    description: album.description ? localize(album.description, locale) : dict.about.albums.intro,
    alternates: alternatesFor(locale, path),
    openGraph: openGraphFor(locale, dict.meta.siteTitle, path, { title }),
  };
}

export default async function AlbumPage({ params }: { params: Params }) {
  const { locale, album } = await load(params);
  const t = getDictionary(locale).about.albums;
  const exhibition = album.exhibitionId
    ? getExhibitions().find((e) => e.id === album.exhibitionId)
    : undefined;

  // Localize on the server so the client payload carries one language only.
  const photos: AlbumPhotoView[] = album.photos.map((p) => ({
    id: p.id,
    src: p.src,
    width: p.width,
    height: p.height,
    alt: localize(p.alt, locale),
    ...(p.caption && { caption: localize(p.caption, locale) }),
    ...(p.credit && { credit: p.credit }),
    ...(p.blurDataURL && { blurDataURL: p.blurDataURL }),
  }));

  return (
    <>
      <Link
        href={localizedPath(locale, '/about/albums')}
        className="text-caption underline decoration-1 underline-offset-4 hover:decoration-2"
      >
        <span aria-hidden>← </span>
        {t.heading}
      </Link>
      <header className="mt-6 mb-stack">
        <h1 className="font-serif text-title">{localize(album.title, locale)}</h1>
        <p className="mt-2 text-caption text-ink-muted tabular-nums">
          <time dateTime={album.date}>{formatPartialDate(album.date, locale)}</time>
        </p>
        {album.description && (
          <p className="mt-3 max-w-prose-archive">{localize(album.description, locale)}</p>
        )}
        {exhibition && (
          <Link
            href={`${localizedPath(locale, '/about/exhibitions')}#${exhibition.id}`}
            data-exhibition-link
            className="mt-3 inline-block text-caption underline decoration-1 underline-offset-4 hover:decoration-2"
          >
            {interpolate(t.fromExhibition, { title: exhibitionLabel(exhibition, locale) })}
          </Link>
        )}
      </header>
      <AlbumPhotoGrid photos={photos} />
    </>
  );
}
