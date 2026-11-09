import type { MetadataRoute } from 'next';
import { locales } from '@/lib/i18n/config';
import { alternatesFor } from '@/lib/i18n/route';
import { getAllArtworks } from '@/lib/data/artworks';
import { getAlbums } from '@/lib/data/about';
import { absoluteUrl } from '@/lib/seo/site-url';

const STATIC_PATHS = ['', '/about', '/about/exhibitions', '/about/albums', '/about/press'];

/** One entry per route × locale, each listing every hreflang alternate (SPEC Appendix A). */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...STATIC_PATHS,
    ...getAllArtworks().map((a) => `/works/${a.slug}`),
    ...getAlbums().map((a) => `/about/albums/${a.id}`),
  ];

  return paths.flatMap((path) =>
    locales.map((locale) => {
      const { canonical, languages } = alternatesFor(locale, path);
      return {
        url: absoluteUrl(canonical),
        alternates: {
          languages: Object.fromEntries(
            Object.entries(languages).map(([lang, href]) => [lang, absoluteUrl(href)]),
          ),
        },
      };
    }),
  );
}
