import { defaultLocale, type Locale } from './config';
import type { Localized } from '@/data/schema/shared';

/** Returns the value for `locale`, falling back to Icelandic if empty/missing. */
export function localize<T>(value: Localized<T>, locale: Locale): T {
  const v = value[locale];
  if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0))
    return value[defaultLocale];
  return v;
}
