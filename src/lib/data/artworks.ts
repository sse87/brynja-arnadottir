import 'server-only';
import raw from '@/data/artworks.json';
import {
  artworkListSchema,
  type Artwork,
  type GalleryItem,
  type NavIndexEntry,
} from '@/data/schema/artwork';
import { localize } from '@/lib/i18n/localize';
import type { Locale } from '@/lib/i18n/config';

export function compareArtworks(a: Artwork, b: Artwork): number {
  // Newest first; undated last; then sortOrder; then id.
  const ay = a.year ?? -Infinity;
  const by = b.year ?? -Infinity;
  if (ay !== by) return by - ay;
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id);
}

// Parsed once at module load → invalid JSON fails `next build`.
const artworks: readonly Artwork[] = artworkListSchema.parse(raw).toSorted(compareArtworks);
const bySlug = new Map(artworks.map((a) => [a.slug, a]));
const byId = new Map(artworks.map((a) => [a.id, a]));

export const getAllArtworks = (): readonly Artwork[] => artworks;
export const getArtworkBySlug = (slug: string): Artwork | undefined => bySlug.get(slug);
export const getArtworkById = (id: string): Artwork | undefined => byId.get(id);

export function toGalleryItem(a: Artwork, locale: Locale): GalleryItem {
  return {
    id: a.id,
    slug: a.slug,
    title: localize(a.title, locale),
    year: a.year,
    yearCirca: a.yearCirca ?? false,
    styleCategory: a.styleCategory,
    reprint: a['available-as-reprint'],
    image: {
      src: a.image.src,
      width: a.image.width,
      height: a.image.height,
      blurDataURL: a.image.blurDataURL,
      alt: localize(a.image.alt, locale),
    },
  };
}

export function getNavIndex(): NavIndexEntry[] {
  return artworks.map((a) => ({
    slug: a.slug,
    styleCategory: a.styleCategory,
    reprint: a['available-as-reprint'],
  }));
}
