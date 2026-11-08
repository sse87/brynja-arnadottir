/**
 * Parses every data JSON file with its Zod schema, checks cross-file references and the locally
 * hosted press assets. Runs before `next build` (see `build` in package.json) and in CI.
 *
 *   pnpm data:validate
 *
 * Imports schemas only — never the `src/lib/data` loaders, which are `server-only`.
 */
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { z } from 'zod';
import { artworkListSchema } from '../src/data/schema/artwork';
import {
  aboutCrossRefIssues,
  albumListSchema,
  biographySchema,
  exhibitionListSchema,
  pressListSchema,
  type PressItem,
} from '../src/data/schema/about';
import { siteSchema } from '../src/data/schema/site';
import { isMain } from './lib/is-main';

export const DATA_FILES = {
  artworks: ['src/data/artworks.json', artworkListSchema],
  site: ['src/data/site.json', siteSchema],
  biography: ['src/data/about/biography.json', biographySchema],
  exhibitions: ['src/data/about/exhibitions.json', exhibitionListSchema],
  albums: ['src/data/about/albums.json', albumListSchema],
  press: ['src/data/about/press.json', pressListSchema],
} as const satisfies Record<string, readonly [string, z.ZodType]>;

type Parsed = { [K in keyof typeof DATA_FILES]?: z.output<(typeof DATA_FILES)[K][1]> };

async function parseFile<S extends z.ZodType>(
  root: string,
  file: string,
  schema: S,
  issues: string[],
): Promise<z.output<S> | undefined> {
  let json: unknown;
  try {
    json = JSON.parse(await readFile(join(root, file), 'utf8'));
  } catch (err) {
    issues.push(`${file}: ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    issues.push(`${file}:\n${z.prettifyError(result.error)}`);
    return undefined;
  }
  return result.data;
}

async function pressAssetIssues(root: string, items: readonly PressItem[]): Promise<string[]> {
  const issues: string[] = [];
  for (const { id, asset } of items) {
    const path = join(root, 'public', asset.href);
    let size: number;
    try {
      size = (await stat(path)).size;
    } catch {
      issues.push(`press.json ${id}: file public${asset.href} does not exist`);
      continue;
    }
    if (size !== asset.bytes)
      issues.push(`press.json ${id}: bytes is ${asset.bytes}, but public${asset.href} is ${size}`);
    if (asset.kind === 'image') {
      const { width, height } = await sharp(path).metadata();
      if (width !== asset.width || height !== asset.height)
        issues.push(
          `press.json ${id}: declared ${asset.width}×${asset.height}, file is ${width}×${height}`,
        );
    }
  }
  return issues;
}

/** Returns every problem found (empty array = all data valid). */
export async function validateData(root: string = process.cwd()): Promise<string[]> {
  const issues: string[] = [];
  const parsed: Parsed = {};
  for (const [key, [file, schema]] of Object.entries(DATA_FILES)) {
    (parsed as Record<string, unknown>)[key] = await parseFile(root, file, schema, issues);
  }
  if (parsed.exhibitions && parsed.albums)
    issues.push(...aboutCrossRefIssues(parsed.exhibitions, parsed.albums));
  if (parsed.press) issues.push(...(await pressAssetIssues(root, parsed.press)));
  return issues;
}

if (isMain(import.meta.url)) {
  const issues = await validateData();
  if (issues.length > 0) {
    console.error(`✗ Data validation failed (${issues.length} issue(s)):\n`);
    for (const issue of issues) console.error(`- ${issue}\n`);
    process.exit(1);
  }
  console.log(`✓ Data valid (${Object.keys(DATA_FILES).length} files)`);
}
