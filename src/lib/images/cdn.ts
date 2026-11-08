/**
 * Bunny Optimizer URL (used where next/image can't run: emails, OG tags, blur script).
 * Requires Bunny Optimizer enabled on the Pull Zone. With automatic WebP/AVIF disabled,
 * the response keeps the master's format (JPEG) — exactly what mail clients need.
 */
export function bunnyTransform(src: string, opts: { width: number; quality?: number }): string {
  const url = new URL(src);
  if (!url.hostname.endsWith('.b-cdn.net') && !url.hostname.startsWith('cdn.')) return src;
  url.searchParams.set('width', String(opts.width));
  url.searchParams.set('quality', String(opts.quality ?? 80));
  return url.toString();
}
