import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('keeps a custom font size and a custom colour side by side', () => {
    expect(cn('text-caption', 'text-ink')).toBe('text-caption text-ink');
  });

  it('dedupes conflicting custom colours, last wins', () => {
    expect(cn('text-ink', 'text-ink-muted')).toBe('text-ink-muted');
    expect(cn('bg-canvas', 'bg-surface')).toBe('bg-surface');
  });

  it('dedupes conflicting custom sizes, last wins', () => {
    expect(cn('text-caption', 'text-title')).toBe('text-title');
  });

  it('treats named spacing and containers as their scales', () => {
    expect(cn('px-gutter', 'px-3')).toBe('px-3');
    expect(cn('max-w-wide', 'max-w-gallery')).toBe('max-w-gallery');
  });

  it('handles conditional inputs via clsx', () => {
    expect(cn('bg-mat', false && 'ring-1', undefined, { 'ring-rule': true })).toBe(
      'bg-mat ring-rule',
    );
  });
});
