/**
 * Public origin of the site, for `metadataBase`, the sitemap and robots.txt.
 * Reads `NEXT_PUBLIC_SITE_URL` directly (not `getServerEnv()`, which also requires the
 * Resend secrets) so builds without secrets still succeed.
 */
export function siteUrl(): URL {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
}

/** `absoluteUrl('/is/about')` → `https://…/is/about` */
export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}
