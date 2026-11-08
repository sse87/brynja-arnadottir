import { EB_Garamond, Inter } from 'next/font/google';

// Latin-1 (the `latin` subset) already covers Icelandic: Þ þ Ð ð Æ æ Ö ö Á É Í Ó Ú Ý.
// `latin-ext` is added for foreign venue/author names (e.g. Č, Ł, Ő).
export const serif = EB_Garamond({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  variable: '--font-garamond',
  display: 'swap',
});

export const sans = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});
