import { z } from 'zod';
import { cdnImage, localizedString, uniqueKeys, type CdnImage, type Localized } from './shared';

export const STYLE_CATEGORIES = ['black-and-white', 'colorful'] as const;
export type StyleCategory = (typeof STYLE_CATEGORIES)[number];

export interface ArtworkDimensions {
  /** Physical sheet/image size of the original drawing, in centimetres. */
  widthCm: number;
  heightCm: number;
}

export interface Artwork {
  /** Stable catalogue ID. Never reuse or renumber. Format: ART-0001 */
  id: string;
  /** URL segment, shared by both locales. Lowercase kebab-case, unique. */
  slug: string;
  title: Localized;
  /** Master image on the CDN. `width`/`height` are the master's intrinsic PIXEL dimensions. */
  image: CdnImage;
  /** Physical dimensions of the original artwork. */
  dimensions: ArtworkDimensions;
  /** Year of creation; `null` if undated. */
  year: number | null;
  /** Renders as "c. 1972" / "um 1972". */
  yearCirca?: boolean;
  styleCategory: StyleCategory;
  /** Whether the estate offers reprints of this work. Key name is contractual — keep the hyphens. */
  'available-as-reprint': boolean;
  medium: Localized;
  description?: Localized;
  /** Lower = earlier in default ordering within the same year. */
  sortOrder?: number;
}

export const artworkSchema = z.strictObject({
  id: z.string().regex(/^ART-\d{4}$/),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: localizedString,
  image: cdnImage,
  dimensions: z.strictObject({ widthCm: z.number().positive(), heightCm: z.number().positive() }),
  year: z.int().min(1900).max(2100).nullable(),
  yearCirca: z.boolean().optional(),
  styleCategory: z.enum(STYLE_CATEGORIES),
  'available-as-reprint': z.boolean(),
  medium: localizedString,
  description: localizedString.optional(),
  sortOrder: z.int().optional(),
}) satisfies z.ZodType<Artwork>;

export const artworkListSchema = z.array(artworkSchema).superRefine(uniqueKeys('id', 'slug'));

/** Lean, localized projection sent to Client Components. */
export interface GalleryItem {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  yearCirca: boolean;
  styleCategory: StyleCategory;
  reprint: boolean;
  image: { src: string; width: number; height: number; blurDataURL?: string; alt: string };
}

/** Minimal ordering index for lightbox prev/next (no titles, no images). */
export interface NavIndexEntry {
  slug: string;
  styleCategory: StyleCategory;
  reprint: boolean;
}
