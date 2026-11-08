import { z } from 'zod';
import { cdnImage, localizedString, localizedStringList, partialDate, uniqueKeys } from './shared';

/* ---------- Biography ---------- */
export const biographySchema = z.strictObject({
  portrait: cdnImage.extend({ credit: z.string().optional(), year: z.int().optional() }),
  born: z.strictObject({ date: partialDate, place: localizedString }),
  died: z.strictObject({ date: partialDate, place: localizedString }),
  lede: localizedString,
  body: localizedStringList, // paragraphs; counts may differ per language
  pullQuote: z
    .strictObject({ text: localizedString, attribution: z.string().optional() })
    .optional(),
});
export type Biography = z.infer<typeof biographySchema>;

/* ---------- Exhibitions ---------- */
export const exhibitionSchema = z.strictObject({
  id: z.string().regex(/^EXH-\d{4}-\d{2}$/),
  date: partialDate,
  endDate: partialDate.optional(),
  title: localizedString,
  location: z.strictObject({
    venue: localizedString,
    city: localizedString,
    countryCode: z.string().length(2).toUpperCase(),
  }),
  type: z.enum(['solo', 'group']),
  albumId: z.string().optional(), // links to a photo album from the opening
});
export const exhibitionListSchema = z.array(exhibitionSchema).superRefine(uniqueKeys('id'));
export type Exhibition = z.infer<typeof exhibitionSchema>;

/* ---------- Albums ---------- */
export const albumPhotoSchema = cdnImage.extend({
  id: z.string(),
  caption: localizedString.optional(),
  credit: z.string().optional(),
});
export const albumSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: localizedString,
    date: partialDate,
    description: localizedString.optional(),
    exhibitionId: z.string().optional(),
    coverPhotoId: z.string(),
    photos: z.array(albumPhotoSchema).min(1).superRefine(uniqueKeys('id')),
  })
  .refine((a) => a.photos.some((p) => p.id === a.coverPhotoId), {
    message: 'coverPhotoId must reference a photo in the album',
    path: ['coverPhotoId'],
  });
export const albumListSchema = z.array(albumSchema).superRefine(uniqueKeys('id'));
export type Album = z.infer<typeof albumSchema>;
export type AlbumPhoto = z.infer<typeof albumPhotoSchema>;

/* ---------- Press ---------- */
export const pressItemSchema = z.strictObject({
  id: z.string().regex(/^PRESS-\d{4}-\d{3}$/),
  publishedAt: partialDate,
  publication: z.string().min(1), // proper noun, not translated
  headline: z.string().min(1), // original-language headline
  headlineLanguage: z.enum(['is', 'en', 'da', 'no', 'sv', 'de', 'other']),
  headlineTranslation: localizedString.partial().optional(),
  author: z.string().optional(),
  page: z.string().optional(),
  summary: localizedString.optional(),
  asset: z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('pdf'),
      href: z.string().regex(/^\/press\/.+\.pdf$/),
      bytes: z.int().positive(),
      pages: z.int().positive().optional(),
    }),
    z.strictObject({
      kind: z.literal('image'),
      href: z.string().regex(/^\/press\/.+\.(jpe?g|png|webp)$/),
      width: z.int().positive(),
      height: z.int().positive(),
      bytes: z.int().positive(),
    }),
  ]),
});
export const pressListSchema = z.array(pressItemSchema).superRefine(uniqueKeys('id'));
export type PressItem = z.infer<typeof pressItemSchema>;

/* ---------- Cross-file integrity ---------- */
/**
 * Exhibition ↔ album links must resolve, and a two-way link must point back at the same record.
 * Returns human-readable issues (empty = valid). Used by the about loader and `validate-data.ts`.
 */
export function aboutCrossRefIssues(
  exhibitions: readonly Pick<Exhibition, 'id' | 'albumId'>[],
  albums: readonly Pick<Album, 'id' | 'exhibitionId'>[],
): string[] {
  const issues: string[] = [];
  const exhibitionById = new Map(exhibitions.map((e) => [e.id, e]));
  const albumById = new Map(albums.map((a) => [a.id, a]));

  for (const e of exhibitions) {
    if (e.albumId === undefined) continue;
    const album = albumById.get(e.albumId);
    if (!album) issues.push(`exhibitions.json ${e.id}: albumId "${e.albumId}" does not exist`);
    else if (album.exhibitionId !== undefined && album.exhibitionId !== e.id)
      issues.push(
        `exhibitions.json ${e.id}: album "${album.id}" links back to "${album.exhibitionId}"`,
      );
  }
  for (const a of albums) {
    if (a.exhibitionId === undefined) continue;
    const exhibition = exhibitionById.get(a.exhibitionId);
    if (!exhibition)
      issues.push(`albums.json ${a.id}: exhibitionId "${a.exhibitionId}" does not exist`);
    else if (exhibition.albumId !== undefined && exhibition.albumId !== a.id)
      issues.push(
        `albums.json ${a.id}: exhibition "${exhibition.id}" links back to "${exhibition.albumId}"`,
      );
  }
  return issues;
}
