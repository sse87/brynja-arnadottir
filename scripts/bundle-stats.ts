/**
 * First-load JS per route, gzipped, checked against the SPEC Appendix B budget.
 *
 *   pnpm build && pnpm bundle:stats
 *
 * Next 16 no longer prints "First Load JS" in the build output. It writes uncompressed bytes per
 * route to `.next/diagnostics/route-bundle-stats.json`; this gzips (level 9) the same chunk list.
 * "Framework" is `rootMainFiles` from the build manifest (React, the Next client, the Turbopack
 * runtime), which every route loads before any app code.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { z } from 'zod';

const BUDGET = { route: '/[locale]', totalKb: 150, appKb: 20 } as const;

const NEXT = '.next';
const statsSchema = z.array(
  z.object({ route: z.string(), firstLoadChunkPaths: z.array(z.string()) }),
);
const manifestSchema = z.object({ rootMainFiles: z.array(z.string()) });

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as unknown;
const rows = statsSchema.parse(readJson(join(NEXT, 'diagnostics', 'route-bundle-stats.json')));
const { rootMainFiles } = manifestSchema.parse(readJson(join(NEXT, 'build-manifest.json')));

const sizes = new Map<string, { raw: number; gzip: number; br: number }>();
function sizeOf(path: string) {
  const key = path.replaceAll('\\', '/');
  let s = sizes.get(key);
  if (!s) {
    const buf = readFileSync(path);
    s = {
      raw: buf.length,
      gzip: gzipSync(buf, { level: 9 }).length,
      br: brotliCompressSync(buf).length,
    };
    sizes.set(key, s);
  }
  return s;
}
const sum = (paths: string[]) =>
  paths
    .map(sizeOf)
    .reduce((a, s) => ({ raw: a.raw + s.raw, gzip: a.gzip + s.gzip, br: a.br + s.br }), {
      raw: 0,
      gzip: 0,
      br: 0,
    });
const kb = (bytes: number) => (bytes / 1024).toFixed(1).padStart(7);

const framework = sum(rootMainFiles.filter((f) => f.endsWith('.js')).map((f) => join(NEXT, f)));
console.log(`${'route'.padEnd(36)}    raw    gzip  brotli  (kB)`);
console.log(
  `${'(framework: rootMainFiles)'.padEnd(36)}${kb(framework.raw)} ${kb(framework.gzip)} ${kb(framework.br)}`,
);
for (const row of rows) {
  const t = sum(row.firstLoadChunkPaths);
  console.log(`${row.route.padEnd(36)}${kb(t.raw)} ${kb(t.gzip)} ${kb(t.br)}`);
}

const gallery = rows.find((r) => r.route === BUDGET.route);
if (!gallery) throw new Error(`No ${BUDGET.route} row in route-bundle-stats.json`);
const total = sum(gallery.firstLoadChunkPaths).gzip / 1024;
const app = total - framework.gzip / 1024;
const ok = total <= BUDGET.totalKb && app <= BUDGET.appKb;
console.log(
  `\n${BUDGET.route}: ${total.toFixed(1)} kB gzip (budget ${BUDGET.totalKb}), ` +
    `app code ${app.toFixed(1)} kB over framework (budget ${BUDGET.appKb}) → ${ok ? 'OK' : 'OVER BUDGET'}`,
);
if (!ok) process.exitCode = 1;
