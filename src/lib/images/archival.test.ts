import { describe, expect, it } from 'vitest';
import { maxCoverWidth, noUpscaleSizes } from './archival';

describe('maxCoverWidth (SPEC §5.5: never upscale)', () => {
  it('is the photo width when the photo is taller than the 4:3 box', () => {
    expect(maxCoverWidth(600, 900)).toBe(600);
  });

  it('is limited by height for wide photos, so the cropped box is never taller than the photo', () => {
    // 900×300 in a 4:3 box: at 400 px wide the box is 300 px tall — any wider would upscale.
    expect(maxCoverWidth(900, 300)).toBe(400);
  });

  it('handles exact 4:3 and tiny photos', () => {
    expect(maxCoverWidth(800, 600)).toBe(800);
    expect(maxCoverWidth(120, 80)).toBe(106);
  });

  it('supports other ratios (4:5 portrait crop)', () => {
    expect(maxCoverWidth(2592, 3872, 4 / 5)).toBe(2592);
    expect(maxCoverWidth(1000, 1000, 4 / 5)).toBe(800);
  });
});

describe('noUpscaleSizes', () => {
  it('never asks for more than the intrinsic width', () => {
    expect(noUpscaleSizes(900)).toBe('(min-width: 900px) 900px, 100vw');
  });
});
