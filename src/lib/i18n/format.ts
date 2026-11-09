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
