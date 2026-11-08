import { z } from 'zod';
import type { Locale } from '@/lib/i18n/config';

export type Localized<T = string> = Record<Locale, T>;

export const localizedString = z.strictObject({ is: z.string().min(1), en: z.string().min(1) });
export const localizedStringList = z.strictObject({
  is: z.array(z.string().min(1)).min(1),
  en: z.array(z.string().min(1)).min(1),
});

/** ISO partial date: "1968" | "1968-03" | "1968-03-15" — sorts correctly as a string. */
export const partialDate = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/);

export const cdnImage = z.strictObject({
  src: z.url({ protocol: /^https$/ }),
  width: z.int().positive(),
  height: z.int().positive(),
  blurDataURL: z.string().startsWith('data:image/').optional(),
  alt: localizedString,
});
export type CdnImage = z.infer<typeof cdnImage>;

/**
 * superRefine callback for arrays: reports `Duplicate <key>: <value>` at `[index, key]` for every
 * repeated value of each listed key.
 */
export function uniqueKeys<T, K extends keyof T & string>(...keys: K[]) {
  return (list: readonly T[], ctx: z.RefinementCtx) => {
    for (const key of keys) {
      const seen = new Set<unknown>();
      list.forEach((item, i) => {
        const value = item[key];
        if (seen.has(value)) {
          ctx.addIssue({
            code: 'custom',
            path: [i, key],
            message: `Duplicate ${key}: ${String(value)}`,
          });
        }
        seen.add(value);
      });
    }
  };
}
