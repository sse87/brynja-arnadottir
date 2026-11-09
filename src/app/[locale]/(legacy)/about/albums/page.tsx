import type { Metadata } from 'next';
import { resolveLocale, alternatesFor, type LocaleParams } from '@/lib/i18n/route';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { openGraphFor } from '@/lib/seo/metadata';
import { getAlbums } from '@/lib/data/about';
import { AlbumIndexGrid } from '@/components/about/AlbumIndexGrid';

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const t = dict.about.albums;
  return {
    title: t.heading,
    description: t.intro,
    alternates: alternatesFor(locale, '/about/albums'),
    openGraph: openGraphFor(locale, dict.meta.siteTitle, '/about/albums', { title: t.heading }),
  };
}

export default async function AlbumsPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const t = dict.about.albums;

  return (
    <>
      <h1 className="font-serif text-title">{t.heading}</h1>
      <p className="mt-3 mb-stack max-w-prose-archive text-ink-muted">{t.intro}</p>
      <AlbumIndexGrid albums={getAlbums()} locale={locale} dict={dict} />
    </>
  );
}
