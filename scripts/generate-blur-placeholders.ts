/**
 * Fills `blurDataURL` on every image object (`src` + `width` + `height`) in the data JSON.
 * Generated offline and committed (SPEC §3.3).
 *
 *   pnpm images:blur            # only images without a blurDataURL
 *   pnpm images:blur --force    # regenerate all
 */
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { bunnyTransform } from '../src/lib/images/cdn';
import { isMain } from './lib/is-main';

export const FILES = [
  'src/data/artworks.json',
  'src/data/about/albums.json',
  'src/data/about/biography.json',
];

export type ToBlur = (src: string) => Promise<string>;

export async function toBlur(src: string): Promise<string> {
  // Ask Bunny Optimizer for a tiny JPEG instead of downloading the master.
  // (If the Optimizer is off on the Pull Zone, the full master comes back — slower, same result.)
  const res = await fetch(bunnyTransform(src, { width: 64, quality: 70 }));
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${src}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = await sharp(buf).resize(16, 16, { fit: 'inside' }).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${out.toString('base64')}`;
}

/** Walks any JSON tree; fills `blurDataURL` on objects that have `src` + `width` + `height`. */
export async function walk(node: unknown, force: boolean, blur: ToBlur): Promise<void> {
  if (Array.isArray(node)) {
    for (const n of node) await walk(n, force, blur);
    return;
  }
  if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if (
      typeof o.src === 'string' &&
      typeof o.width === 'number' &&
      typeof o.height === 'number' &&
      (force || !o.blurDataURL)
    ) {
      o.blurDataURL = await blur(o.src);
      console.log('✓', o.src);
    }
    for (const v of Object.values(o)) await walk(v, force, blur);
  }
}

/** Same `src` appearing in several places is fetched once per run. */
export function memoize(blur: ToBlur): ToBlur {
  const cache = new Map<string, Promise<string>>();
  return (src) => {
    let p = cache.get(src);
    if (!p) cache.set(src, (p = blur(src)));
    return p;
  };
}

if (isMain(import.meta.url)) {
  const force = process.argv.includes('--force');
  const blur = memoize(toBlur);
  for (const file of FILES) {
    const before = await readFile(file, 'utf8');
    const json: unknown = JSON.parse(before);
    await walk(json, force, blur);
    const after = `${JSON.stringify(json, null, 2)}\n`;
    if (after !== before) {
      await writeFile(file, after);
      console.log('wrote', file);
    }
  }
}
