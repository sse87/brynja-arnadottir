import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** True when the module at `importMetaUrl` is the entry point (`tsx scripts/x.ts`), not an import (tests). */
export function isMain(importMetaUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  // Windows paths are case-insensitive and drive-letter case varies between shells.
  const norm = (p: string) => (process.platform === 'win32' ? p.toLowerCase() : p);
  return norm(resolve(entry)) === norm(fileURLToPath(importMetaUrl));
}
