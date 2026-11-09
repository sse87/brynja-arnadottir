import { EB_Garamond, Inter } from 'next/font/google';

// `subsets` only decides which files are *preloaded*. next/font self-hosts every subset Google
// serves (latin-ext included) behind `unicode-range`, so foreign venue/author names (Č, Ł, Ő)
// still render in the right face; that file just isn't fetched until a page uses those glyphs.
// Latin-1 (the `latin` subset) already covers Icelandic: Þ þ Ð ð Æ æ Ö ö Á É Í Ó Ú Ý.
export const serif = EB_Garamond({
  subsets: ['latin'],
  style: ['normal'],
  variable: '--font-garamond',
  display: 'swap',
});

// Italic is a separate instance so it isn't preloaded on every page: only the biography quote
// uses it (`font-serif-italic italic`). One family can't hold both: with `font-serif italic` the
// browser would synthesize a slanted roman rather than fall through to a second family.
export const serifItalic = EB_Garamond({
  subsets: ['latin'],
  style: ['italic'],
  variable: '--font-garamond-italic',
  display: 'swap',
  preload: false,
});

export const sans = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
