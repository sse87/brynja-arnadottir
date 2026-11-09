import { describe, expect, it } from 'vitest';
import type { PressItem } from '@/data/schema/about';
import en from '@/data/dictionaries/en.json';
import is from '@/data/dictionaries/is.json';
import { pressFileMeta, pressLinkDetails, translationFor, yearAnchors } from './press';

const copy = {
  is: { press: is.about.press, footer: is.footer },
  en: { press: en.about.press, footer: en.footer },
};

const pdf: PressItem = {
  id: 'PRESS-1974-001',
  publishedAt: '1974-05-18',
  publication: 'Morgunblaðið',
  headline: 'Línan sem lifir',
  headlineLanguage: 'is',
  headlineTranslation: { en: 'The Line That Lives' },
  asset: { kind: 'pdf', href: '/press/x.pdf', bytes: 2_348_123, pages: 2 },
};

const image: PressItem = {
  id: 'PRESS-1991-002',
  publishedAt: '1991-11',
  publication: 'DV',
  headline: 'Teiknarinn',
  headlineLanguage: 'is',
  asset: { kind: 'image', href: '/press/x.jpg', width: 600, height: 860, bytes: 12_664 },
};

describe('pressFileMeta', () => {
  it('shows the localized file type and size', () => {
    expect(pressFileMeta(pdf, 'is', copy.is)).toBe('PDF · 2,3 MB');
    expect(pressFileMeta(pdf, 'en', copy.en)).toBe('PDF · 2.3 MB');
    expect(pressFileMeta(image, 'is', copy.is)).toBe('Mynd · 12,7 kB');
    expect(pressFileMeta(image, 'en', copy.en)).toBe('Image · 12.7 kB');
  });
});

describe('pressLinkDetails', () => {
  it('names the localized file type, size and new tab', () => {
    expect(pressLinkDetails(pdf, 'is', copy.is)).toBe('(PDF, 2,3 MB) (opnast í nýjum flipa)');
    expect(pressLinkDetails(image, 'en', copy.en)).toBe('(Image, 12.7 kB) (opens in a new tab)');
  });
});

describe('translationFor', () => {
  it('shows a translation only when it exists for the page language', () => {
    expect(translationFor(pdf, 'en')).toBe('The Line That Lives');
    expect(translationFor(pdf, 'is')).toBeUndefined();
    expect(translationFor(image, 'en')).toBeUndefined();
  });

  it('never "translates" a headline already in the page language', () => {
    const english: PressItem = {
      ...pdf,
      headlineLanguage: 'en',
      headlineTranslation: { en: 'Same', is: 'Línan' },
    };
    expect(translationFor(english, 'en')).toBeUndefined();
    expect(translationFor(english, 'is')).toBe('Línan');
  });
});

describe('yearAnchors', () => {
  it('anchors the first item of each year only', () => {
    const items = [
      { ...image, id: 'PRESS-1991-002', publishedAt: '1991-11' },
      { ...image, id: 'PRESS-1991-001', publishedAt: '1991-02-03' },
      { ...pdf, id: 'PRESS-1974-001', publishedAt: '1974' },
    ];
    expect([...yearAnchors(items)]).toEqual([
      ['PRESS-1991-002', 'y1991'],
      ['PRESS-1974-001', 'y1974'],
    ]);
  });
});
