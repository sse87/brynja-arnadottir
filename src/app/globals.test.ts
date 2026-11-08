import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { compile } from 'tailwindcss';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const GLOBALS = path.resolve(import.meta.dirname, 'globals.css');

/** Compiles globals.css with Tailwind and returns the CSS emitted for `candidates`. */
async function buildCss(candidates: string[]): Promise<string> {
  const compiler = await compile(await readFile(GLOBALS, 'utf8'), {
    base: path.dirname(GLOBALS),
    async loadStylesheet(id, base) {
      const file =
        id === 'tailwindcss' ? require.resolve('tailwindcss/index.css') : path.resolve(base, id);
      return { path: file, base: path.dirname(file), content: await readFile(file, 'utf8') };
    },
  });
  return compiler.build(candidates);
}

describe('globals.css design tokens (SPEC §6.3)', () => {
  it('removes the default palette and radius scale', async () => {
    const css = await buildCss([
      'bg-gray-100',
      'text-blue-500',
      'border-red-200',
      'rounded-lg',
      'bg-black',
    ]);
    for (const cls of [
      '.bg-gray-100',
      '.text-blue-500',
      '.border-red-200',
      '.rounded-lg',
      '.bg-black',
    ]) {
      expect(css).not.toContain(cls);
    }
    expect(css).not.toMatch(/--color-(gray|blue|red)-/);
  });

  it('generates semantic token utilities', async () => {
    const css = await buildCss([
      'bg-canvas',
      'text-ink',
      'text-ink-muted',
      'border-rule',
      'bg-mat',
      'text-caption',
      'text-display',
      'font-serif',
      'px-gutter',
      'py-section',
      'gap-stack',
      'max-w-wide',
      'max-w-prose-archive',
      'rounded-full',
      'animate-fade-in',
      'ink-color:text-mat-ink',
      'ink-mono:ring-rule',
    ]);
    for (const cls of [
      '.bg-canvas',
      '.text-ink',
      '.text-ink-muted',
      '.border-rule',
      '.bg-mat',
      '.text-caption',
      '.text-display',
      '.font-serif',
      '.px-gutter',
      '.py-section',
      '.gap-stack',
      '.max-w-wide',
      '.max-w-prose-archive',
      '.rounded-full',
      '.animate-fade-in',
      '.ink-color\\:text-mat-ink',
      '.ink-mono\\:ring-rule',
    ]) {
      expect(css).toContain(cls);
    }
  });

  it('keeps the mat override after the ink profile so the viewer choice wins', async () => {
    const css = await buildCss([]);
    const ink = css.indexOf('[data-ink="color"]');
    const mat = css.indexOf('[data-mat="dark"]');
    expect(ink).toBeGreaterThan(-1);
    expect(mat).toBeGreaterThan(ink);
  });
});
