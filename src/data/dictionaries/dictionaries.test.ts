import { describe, expect, it } from 'vitest';
import { INQUIRY_ERROR_CODES } from '@/data/schema/inquiry';
import en from './en.json';
import is from './is.json';

/** Flattens `{ a: { b: 'x' } }` → `{ 'a.b': 'x' }`. */
function flatten(node: unknown, prefix = ''): Record<string, unknown> {
  if (node === null || typeof node !== 'object') return { [prefix]: node };
  return Object.entries(node).reduce<Record<string, unknown>>(
    (acc, [k, v]) => ({ ...acc, ...flatten(v, prefix ? `${prefix}.${k}` : k) }),
    {},
  );
}

const flatIs = flatten(is);
const flatEn = flatten(en);

// `satisfies Dictionary` catches missing keys at compile time but not extra keys on imported JSON.
describe('dictionaries (SPEC §2.4)', () => {
  it('have identical key sets', () => {
    expect(Object.keys(flatEn).sort()).toEqual(Object.keys(flatIs).sort());
  });

  it('contain only non-empty strings', () => {
    for (const [key, value] of [...Object.entries(flatIs), ...Object.entries(flatEn)]) {
      expect(typeof value, key).toBe('string');
      expect((value as string).trim(), key).not.toBe('');
    }
  });

  it('cover every inquiry error code', () => {
    for (const dict of [is, en]) {
      expect(Object.keys(dict.inquiry.errors).sort()).toEqual([...INQUIRY_ERROR_CODES].sort());
    }
  });

  it('use the same {placeholders} in both languages', () => {
    const vars = (s: unknown) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(flatIs)) {
      expect(vars(flatEn[key]), key).toEqual(vars(flatIs[key]));
    }
  });
});
