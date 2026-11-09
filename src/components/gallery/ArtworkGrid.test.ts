import { describe, expect, it } from 'vitest';
import { lcpIndex } from './ArtworkGrid';

const img = (width: number, height: number) => ({ image: { width, height } }) as never;

describe('lcpIndex', () => {
  it('picks the tallest work in the 2-column first row', () => {
    expect(lcpIndex([img(8288, 2952), img(8260, 11907), img(2875, 8208)])).toBe(1);
    expect(lcpIndex([img(100, 200), img(200, 100)])).toBe(0);
  });

  it('handles a single item and an empty list', () => {
    expect(lcpIndex([img(100, 100)])).toBe(0);
    expect(lcpIndex([])).toBe(0);
  });
});
