import { localeMeta, type Locale } from './config';

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

export function plural(
  locale: Locale,
  count: number,
  forms: { one: string; other: string },
): string {
  const rule = new Intl.PluralRules(localeMeta[locale].intl).select(count);
  return interpolate(rule === 'one' ? forms.one : forms.other, { count });
}

/** Formats "1968" | "1968-03" | "1968-03-15" without timezone drift (always UTC). */
export function formatPartialDate(iso: string, locale: Locale): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y) return iso;
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  const opts: Intl.DateTimeFormatOptions = d
    ? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
    : m
      ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
      : { year: 'numeric', timeZone: 'UTC' };
  return new Intl.DateTimeFormat(localeMeta[locale].intl, opts).format(date);
}

/** ISO 3166 region code → localized country name: "NO" → "Noregur" (is) / "Norway" (en). */
export function countryName(code: string, locale: Locale): string {
  return new Intl.DisplayNames(localeMeta[locale].intl, { type: 'region' }).of(code) ?? code;
}

/**
 * Decimal file size: 2 348 123 → "2,3 MB" (is) / "2.3 MB" (en). Below 1 MB it switches to kB so
 * small scans don't read as "0 MB" (SPEC §5.6). The threshold is where kB would round to "1000 kB".
 */
export function formatFileSize(bytes: number, locale: Locale): string {
  const mb = bytes >= 999_950;
  return new Intl.NumberFormat(localeMeta[locale].intl, {
    style: 'unit',
    unit: mb ? 'megabyte' : 'kilobyte',
    maximumFractionDigits: 1,
  }).format(mb ? bytes / 1_000_000 : bytes / 1_000);
}

/** 29.7 → "29,7" (is) / "29.7" (en). */
export function formatCm(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeMeta[locale].intl, { maximumFractionDigits: 1 }).format(value);
}

export function formatDimensions(w: number, h: number, locale: Locale): string {
  return `${formatCm(w, locale)} × ${formatCm(h, locale)} cm`;
}

/** Artwork year label: "1978" | "c. 1978" / "um 1978" | "Undated" / "Ódagsett". */
export function formatArtworkYear(
  year: number | null,
  circa: boolean | undefined,
  t: { circa: string; undated: string },
): string {
  if (year === null) return t.undated;
  return circa ? `${t.circa} ${year}` : String(year);
}
