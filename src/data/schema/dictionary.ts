import type { InquiryErrorCode } from './inquiry';

export interface Dictionary {
  meta: { siteTitle: string; siteDescription: string };
  languageToggle: { label: string; ariaLabel: string }; // Text is in the TARGET language
  nav: {
    works: string;
    about: string;
    biography: string;
    exhibitions: string;
    albums: string;
    press: string;
    skipToContent: string;
    primary: string;
    aboutSections: string;
  };
  hero: { eyebrow: string; tagline: string };
  gallery: {
    heading: string;
    filtersLegend: string;
    color: { label: string; all: string; 'black-and-white': string; colorful: string };
    availability: { label: string; all: string; reprints: string };
    resultCount: { one: string; other: string };
    empty: string;
    reset: string;
  };
  lightbox: {
    close: string;
    previous: string;
    next: string;
    year: string;
    medium: string;
    dimensions: string;
    catalogueId: string;
    circa: string;
    undated: string;
    reprintAvailable: string;
    buyReprint: string;
    mat: { label: string; light: string; dark: string };
    openFullPage: string;
  };
  inquiry: {
    heading: string;
    intro: string;
    regarding: string;
    name: string;
    email: string;
    message: string;
    messagePlaceholder: string;
    allRequired: string;
    submit: string;
    submitting: string;
    back: string;
    successTitle: string;
    successBody: string;
    privacyNote: string;
    errors: Record<InquiryErrorCode, string>;
  };
  about: {
    heading: string;
    biography: { portraitCredit: string; born: string; died: string };
    exhibitions: {
      heading: string;
      intro: string;
      solo: string;
      group: string;
      photoAlbum: string;
    };
    albums: {
      heading: string;
      intro: string;
      photoCount: { one: string; other: string };
      close: string;
      previous: string;
      next: string;
      fromExhibition: string; // {title}
      photoOf: string; // {index} {total}
    };
    press: {
      heading: string;
      intro: string;
      page: string;
      open: string;
      fileTypes: { pdf: string; image: string };
      translatedHeadline: string;
      jumpToYear: string;
    };
  };
  footer: { facebook: string; opensInNewTab: string; rights: string };
  notFound: { title: string; body: string; home: string };
  error: { title: string; retry: string };
}
