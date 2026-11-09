import 'server-only';
import rawBiography from '@/data/about/biography.json';
import rawExhibitions from '@/data/about/exhibitions.json';
import rawAlbums from '@/data/about/albums.json';
import rawPress from '@/data/about/press.json';
import {
  aboutCrossRefIssues,
  albumListSchema,
  biographySchema,
  exhibitionListSchema,
  pressListSchema,
  type Album,
  type Biography,
  type Exhibition,
  type PressItem,
} from '@/data/schema/about';
import { exhibitionSortKey } from '@/lib/about/timeline';

// Partial ISO dates ("1968" < "1968-03" < "1968-03-15") sort correctly as plain strings.
const byString = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export const compareExhibitions = (a: Exhibition, b: Exhibition) =>
  byString(exhibitionSortKey(a), exhibitionSortKey(b)) || byString(a.id, b.id);
export const compareAlbums = (a: Album, b: Album) =>
  byString(b.date, a.date) || byString(a.id, b.id);
export const comparePress = (a: PressItem, b: PressItem) =>
  byString(b.publishedAt, a.publishedAt) || byString(a.id, b.id);

// Parsed once at module load → invalid JSON fails `next build`.
const biography: Biography = biographySchema.parse(rawBiography);
const exhibitions: readonly Exhibition[] = exhibitionListSchema
  .parse(rawExhibitions)
  .toSorted(compareExhibitions);
const albums: readonly Album[] = albumListSchema.parse(rawAlbums).toSorted(compareAlbums);
const press: readonly PressItem[] = pressListSchema.parse(rawPress).toSorted(comparePress);

const crossRefIssues = aboutCrossRefIssues(exhibitions, albums);
if (crossRefIssues.length > 0) throw new Error(`Invalid about data:\n${crossRefIssues.join('\n')}`);

const albumById = new Map(albums.map((a) => [a.id, a]));

export const getBiography = (): Biography => biography;
/** Ascending by date (seasons at their first month), tie-break by id. */
export const getExhibitions = (): readonly Exhibition[] => exhibitions;
/** Descending by date. */
export const getAlbums = (): readonly Album[] => albums;
export const getAlbum = (id: string): Album | undefined => albumById.get(id);
/** Descending by publishedAt. */
export const getPressItems = (): readonly PressItem[] => press;
