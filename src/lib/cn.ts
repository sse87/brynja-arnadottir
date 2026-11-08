import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge the custom scales so `text-caption` (size) and `text-ink` (colour) don't collide.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        'canvas',
        'surface',
        'ink',
        'ink-muted',
        'ink-subtle',
        'rule',
        'rule-strong',
        'focus',
        'scrim',
        'mat',
        'mat-ink',
        'danger',
        'success',
      ],
      text: ['display', 'title', 'lede', 'body', 'caption', 'eyebrow'],
      spacing: ['gutter', 'stack', 'section'],
      container: ['prose-archive', 'wide', 'gallery'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
