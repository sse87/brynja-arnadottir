import { describe, expect, it } from 'vitest';
import { localize } from './localize';

describe('localize (SPEC §2.5)', () => {
  it('returns the requested locale', () => {
    expect(localize({ is: 'Hraun', en: 'Lava' }, 'en')).toBe('Lava');
    expect(localize({ is: 'Hraun', en: 'Lava' }, 'is')).toBe('Hraun');
  });

  it('falls back to Icelandic for an empty string', () => {
    expect(localize({ is: 'Hraun', en: '' }, 'en')).toBe('Hraun');
  });

  it('falls back to Icelandic for an empty list', () => {
    expect(localize<string[]>({ is: ['a'], en: [] }, 'en')).toEqual(['a']);
  });

  it('falls back to Icelandic for a missing value', () => {
    const partial = { is: 'Hraun' } as unknown as { is: string; en: string };
    expect(localize(partial, 'en')).toBe('Hraun');
  });
});
