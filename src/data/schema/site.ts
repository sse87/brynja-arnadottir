import { z } from 'zod';

export const siteSchema = z.strictObject({
  artist: z.strictObject({ name: z.string(), born: z.string(), died: z.string() }),
  // strictObject: any key other than `facebook` (e.g. "instagram") fails the build.
  social: z.strictObject({
    facebook: z.strictObject({ url: z.url().regex(/^https:\/\/(www\.)?facebook\.com\//) }),
  }),
});
export type Site = z.infer<typeof siteSchema>;
