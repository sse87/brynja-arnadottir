import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { validateData } from './validate-data';

describe('validate-data', () => {
  it('finds no issues in the committed data', async () => {
    expect(await validateData()).toEqual([]);
  });

  describe('against a broken copy', () => {
    let root: string;

    beforeAll(async () => {
      root = await mkdtemp(join(tmpdir(), 'validate-data-'));
      await cp('src/data', join(root, 'src/data'), { recursive: true });
      await cp('public/press', join(root, 'public/press'), { recursive: true });
    });
    afterAll(() => rm(root, { recursive: true, force: true }));

    const edit = async (file: string, fn: (json: unknown[]) => void) => {
      const path = join(root, file);
      const json = JSON.parse(await readFile(path, 'utf8')) as unknown[];
      fn(json);
      await writeFile(path, JSON.stringify(json));
    };

    it('reports schema, cross-reference and press asset problems', async () => {
      await edit('src/data/artworks.json', (list) => list.push(list[0]));
      await edit('src/data/about/exhibitions.json', (list) => {
        (list[1] as { albumId: string }).albumId = 'missing-album';
      });
      await edit('src/data/about/press.json', (list) => {
        (list[0] as { asset: { bytes: number } }).asset.bytes += 1;
      });
      await writeFile(join(root, 'src/data/site.json'), '{ not json');

      const issues = (await validateData(root)).join('\n');
      expect(issues).toContain('Duplicate id: ART-0001');
      expect(issues).toContain('src/data/site.json');
      expect(issues).toContain('albumId "missing-album" does not exist');
      expect(issues).toMatch(/PRESS-\d{4}-\d{3}: bytes is/);
    });
  });
});
