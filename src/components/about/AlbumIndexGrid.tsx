import Image from 'next/image';
import Link from 'next/link';
import type { Album } from '@/data/schema/about';
import type { Dictionary } from '@/data/schema/dictionary';
import type { Locale } from '@/lib/i18n/config';
import { formatPartialDate, plural } from '@/lib/i18n/format';
import { localize } from '@/lib/i18n/localize';
import { localizedPath } from '@/lib/i18n/route';
import { maxCoverWidth } from '@/lib/images/archival';

/** `albums` must already be sorted newest first (getAlbums()). */
export function AlbumIndexGrid({
  albums,
  locale,
  dict,
}: {
  albums: readonly Album[];
  locale: Locale;
  dict: Dictionary;
}) {
  const t = dict.about.albums;

  return (
    <ul className="grid grid-cols-1 gap-x-gutter gap-y-stack sm:grid-cols-2 lg:grid-cols-3">
      {albums.map((album, i) => {
        // The schema guarantees coverPhotoId resolves; fall back to the first photo regardless.
        const cover = album.photos.find((p) => p.id === album.coverPhotoId) ?? album.photos[0];
        if (!cover) return null;
        return (
          <li key={album.id} data-album={album.id} className="group">
            <Link href={localizedPath(locale, `/about/albums/${album.id}`)} className="block">
              <Image
                src={cover.src}
                alt={localize(cover.alt, locale)}
                width={cover.width}
                height={cover.height}
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
                quality={70}
                loading={i < 3 ? 'eager' : 'lazy'}
                placeholder={cover.blurDataURL ? 'blur' : 'empty'}
                blurDataURL={cover.blurDataURL}
                // Archival photo: the 4:3 crop must never upscale it (SPEC §5.5).
                style={{ maxWidth: maxCoverWidth(cover.width, cover.height) }}
                className="aspect-4/3 h-auto w-full bg-mat object-cover"
              />
              <h2 className="mt-3 font-serif text-lede leading-snug decoration-1 underline-offset-4 group-hover:underline">
                {localize(album.title, locale)}
              </h2>
            </Link>
            <p className="mt-1 text-caption text-ink-muted tabular-nums">
              <time dateTime={album.date}>{formatPartialDate(album.date, locale)}</time> ·{' '}
              {plural(locale, album.photos.length, t.photoCount)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
