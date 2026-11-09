/**
 * Archival photos are often low resolution and must never be shown larger than their intrinsic
 * size (SPEC §5.5). These helpers give the CSS caps and `sizes` hints that guarantee it.
 */

/**
 * Widest a box of `ratio` (width / height) may be while `object-cover` still never upscales:
 * the box must be no wider than the photo and no taller than it.
 */
export function maxCoverWidth(width: number, height: number, ratio = 4 / 3): number {
  return Math.min(width, Math.floor(height * ratio));
}

/** `sizes` for an image capped at its intrinsic width: never request more pixels than exist. */
export function noUpscaleSizes(width: number): string {
  return `(min-width: ${width}px) ${width}px, 100vw`;
}
