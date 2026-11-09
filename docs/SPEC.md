# Brynja Árnadóttir — Bilingual Legacy Archive
## Engineering Specification v1.0

| Key | Value |
|---|---|
| Document type | Technical specification / build blueprint |
| Audience | Implementing engineer + Claude Code |
| Spec date | 2026-11-08 |
| Primary locale | Icelandic (`is`) — default & fallback |
| Secondary locale | English (`en`) |
| Hosting | Vercel |
| Status | Approved for implementation |

---

## 0. Ground Rules

### 0.1 Purpose

A permanent, low-maintenance, bilingual digital archive of a deceased pen-and-ink artist. It presents (a) a filterable portfolio of black-and-white and colour pen drawings, (b) legacy material (biography, exhibition history, archival photo albums, press clippings), and (c) a reprint-inquiry flow that emails the estate. There is no checkout, no CMS, no database and no authentication.

### 0.2 Stack (pin major versions)

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js **16.x** App Router, RSC | On 15.x, see §2.2 note on `middleware.ts` |
| UI runtime | React **19.x** | `useActionState`, `<Context value>` provider syntax |
| Language | TypeScript **6.x**, `strict: true`, `noUncheckedIndexedAccess: true` | Not 7.x: the native port has no JS API, which `next build` needs. `package.json` has `"type": "module"` |
| Styling | Tailwind CSS **4.x** (CSS-first `@theme`) | v3 fallback config in §6.6 |
| Validation | Zod **4.x** | `z.email()`, `z.flattenError()`, `{ error }` param |
| Email | `resend` (latest) + `react-email` **6.x** | Components are imported from `react-email` (`@react-email/components` is deprecated on npm). `@react-email/ui` (dev) powers the `email dev` preview server |
| Images | `next/image` (Vercel Image Optimization) + Bunny.net masters | Bunny Storage Zone → Pull Zone (`*.b-cdn.net`); Bunny Optimizer for email/OG thumbnails only |
| Class utils | `clsx` + `tailwind-merge` v3 | |
| Icons | `simple-icons` (Facebook only) | |
| Tooling | pnpm, ESLint (flat config), Prettier + `prettier-plugin-tailwindcss`, Vitest 5 + `vite` (required peer), `@playwright/test` (E2E, Chromium only), `tsx`, `sharp` (scripts only) | `next lint` is removed in Next 16; call `eslint` directly. pnpm blocks dependency build scripts: `pnpm-workspace.yaml` `allowBuilds` allows `esbuild` only |
| Next.js flags | `cacheComponents`, `partialPrefetching` and `reactCompiler` are **off** | create-next-app 16.4 enables all three by default. This spec targets the classic static-generation model (`generateStaticParams`, Suspense fallbacks for `useSearchParams`) |

### 0.3 Non-goals

- No CMS, database, auth, cart, or payment processing. "Buy a Reprint" = an emailed inquiry.
- No localized URL path segments (both locales share English segment names: `/is/about/press`, `/en/about/press`).
- No Instagram or any social network other than the official Facebook Page.
- No client-side global state library (Redux/Zustand). URL + React state only.

### 0.4 Conventions for Claude Code

1. Server Components by default. Add `'use client'` only to the smallest interactive leaf.
2. Absolute imports via `@/*` → `src/*`. Named exports everywhere except Next.js file conventions and the React Email template (needs a default export for the preview server).
3. No `any`. No non-null assertions on data from JSON — parse with Zod at module load.
4. All user-visible strings come from `src/data/dictionaries/{is,en}.json`. No hard-coded copy in components (exception: proper nouns inside data JSON).
5. Every data loader imports `server-only`. Full JSON datasets must never be serialized into client bundles — pass lean, localized projections as props.
6. Every phase in Appendix C must pass: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
7. Never apply CSS `filter`, `mix-blend-mode`, `opacity < 1`, rounded corners, or drop shadows to artwork images.

### 0.5 Environment variables

```bash
# .env.example
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL="Brynja Árnadóttir Archive <inquiries@brynjaarnadottir.is>"   # domain verified in Resend
INQUIRY_TO_EMAIL=estate@brynjaarnadottir.is
NEXT_PUBLIC_SITE_URL=https://brynja-arnadottir.vercel.app
```

Set all variables in Vercel for **Production, Preview and Development**.

### 0.6 `package.json` scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "pnpm data:validate && next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "next typegen && tsc --noEmit",
    "test": "vitest run",
    "format": "prettier --write .",
    "data:validate": "tsx scripts/validate-data.ts",
    "images:blur": "tsx scripts/generate-blur-placeholders.ts",
    "email": "email dev --dir src/components/emails --port 3001",
    "test:e2e": "playwright test"
  }
}
```

`test:e2e` runs against the production build (`pnpm build && pnpm test:e2e`), and it is not part of the per-phase gate. One-time setup: `pnpm exec playwright install chromium`.

`build` runs `data:validate` first. Loaders only parse the files that some page imports, and the about pages arrive late (Phase 7). This way every data file and cross-reference is checked on every build, Vercel included.

---

## 1. Comprehensive Directory Structure

```text
.
├── .env.example
├── eslint.config.mjs
├── next.config.ts                     # includes the `@tailwindcss/turbopack` CSS loader rule (no postcss.config.mjs)
├── pnpm-workspace.yaml                # allowBuilds (pnpm 12 blocks dependency build scripts by default)
├── prettier.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts               # E2E against `next start` on :3210 (never reuses a running server)
├── e2e/
│   ├── lightbox.spec.ts               # §3.7 acceptance criteria
│   ├── inquiry.spec.ts                # §4.6 form, incl. JavaScript disabled
│   ├── about.spec.ts                  # §5 legacy sections (sorting, dates, no upscaling, press links)
│   └── seo.spec.ts                    # Appendix A / §3.3: security headers, sitemap/robots, no CSP violations
├── package.json
├── public/
│   ├── press/                         # Locally hosted scanned clippings (PDF / JPG / PNG)
│   │   ├── 1974-05-18-morgunbladid.pdf
│   │   └── 1991-11-02-dv-clipping.jpg
│   ├── icon.svg
│   └── og-default.jpg                 # 1200×630 static Open Graph fallback
├── scripts/
│   ├── lib/is-main.ts                 # Entry-point guard so scripts can be imported by tests
│   ├── generate-blur-placeholders.ts  # Writes blurDataURL into JSON (§3.3)
│   └── validate-data.ts               # Parses every JSON with Zod + cross-refs; runs before `next build`
└── src/
    ├── proxy.ts                       # Locale detection + redirect (Next 16 “proxy”, ex-middleware)
    ├── app/
    │   ├── globals.css                # Tailwind v4 entry + design tokens (§6)
    │   ├── fonts.ts                   # next/font declarations
    │   ├── sitemap.ts
    │   ├── robots.ts
    │   ├── actions/
    │   │   └── sendInquiry.ts         # 'use server' — Zod + Resend (§4)
    │   └── [locale]/
    │       ├── layout.tsx             # ROOT layout (<html lang>), receives `modal` slot
    │       ├── not-found.tsx          # Localized 404 (for notFound() calls)
    │       ├── error.tsx              # 'use client' localized error boundary
    │       ├── [...rest]/
    │       │   └── page.tsx           # Catch-all → notFound() so unknown URLs get localized 404
    │       ├── @modal/                # Parallel route slot for the Lightbox
    │       │   ├── default.tsx        # → null
    │       │   ├── [...rest]/         # Same param name as children's [...rest] (see §3.7)
    │       │   │   └── page.tsx       # → null (closes modal on navigation elsewhere)
    │       │   └── (.)works/
    │       │       └── [slug]/
    │       │           └── page.tsx   # Intercepted route → <LightboxDialog>
    │       ├── (portfolio)/           # Route group: gallery + artwork detail
    │       │   ├── page.tsx           # “/[locale]” — Hero + Gallery
    │       │   └── works/
    │       │       └── [slug]/
    │       │           └── page.tsx   # Full-page artwork view (direct loads, SEO, share links)
    │       └── (legacy)/              # Route group: legacy material
    │           └── about/
    │               ├── layout.tsx     # About header + sub-navigation
    │               ├── page.tsx       # Biography
    │               ├── exhibitions/
    │               │   └── page.tsx   # Exhibition Timeline
    │               ├── albums/
    │               │   ├── page.tsx   # Album index
    │               │   └── [albumId]/
    │               │       └── page.tsx
    │               └── press/
    │                   └── page.tsx   # Press & Media Archive
    ├── components/
    │   ├── providers/
    │   │   └── I18nProvider.tsx       # 'use client' — locale + client message slices
    │   ├── layout/
    │   │   ├── Header.tsx
    │   │   ├── NavLinks.tsx           # 'use client' (active state)
    │   │   ├── LanguageToggle.tsx     # 'use client'
    │   │   ├── Footer.tsx
    │   │   ├── SocialLink.tsx         # Facebook only
    │   │   └── SkipLink.tsx
    │   ├── home/
    │   │   └── Hero.tsx
    │   ├── gallery/
    │   │   ├── Gallery.tsx            # 'use client' — combined filter state
    │   │   ├── GalleryFilters.tsx     # 'use client'
    │   │   ├── ArtworkGrid.tsx        # Shared (server fallback + client)
    │   │   ├── ArtworkCard.tsx        # Shared
    │   │   └── EmptyState.tsx
    │   ├── artwork/
    │   │   ├── ArtworkDetailView.tsx  # Server — shared by modal + full page (image + <dl> inline)
    │   │   ├── LightboxDialog.tsx     # 'use client' — native <dialog>
    │   │   ├── LightboxNav.tsx        # 'use client' — prev/next + keyboard
    │   │   └── ReprintPanel.tsx       # 'use client' — CTA ↔ form view switch; owns useActionState
    │   ├── inquiry/
    │   │   ├── ReprintInquiryForm.tsx # 'use client' — renders state from ReprintPanel
    │   │   ├── FormField.tsx
    │   │   └── SubmitButton.tsx       # 'use client' — useFormStatus
    │   ├── about/
    │   │   ├── AboutNav.tsx           # 'use client'
    │   │   ├── Biography.tsx
    │   │   ├── ExhibitionTimeline.tsx
    │   │   ├── AlbumIndexGrid.tsx
    │   │   ├── AlbumPhotoGrid.tsx     # 'use client' — simple photo dialog
    │   │   └── PressArchiveList.tsx
    │   ├── emails/
    │   │   └── ReprintInquiryEmail.tsx
    │   ├── icons/
    │   │   └── FacebookIcon.tsx
    │   ├── seo/
    │   │   └── JsonLd.tsx          # <script type="application/ld+json"> with `<` escaped
    │   └── ui/
    │       ├── SegmentedControl.tsx   # 'use client'
    │       └── VisuallyHidden.tsx
    ├── data/
    │   ├── artworks.json
    │   ├── site.json
    │   ├── about/
    │   │   ├── biography.json
    │   │   ├── exhibitions.json
    │   │   ├── albums.json
    │   │   └── press.json
    │   ├── dictionaries/
    │   │   ├── is.json
    │   │   └── en.json
    │   └── schema/                    # TS interfaces + Zod schemas (no server-only)
    │       ├── shared.ts
    │       ├── artwork.ts
    │       ├── about.ts
    │       ├── site.ts
    │       ├── inquiry.ts
    │       └── dictionary.ts
    └── lib/
        ├── cn.ts
        ├── env.ts                     # server-only, lazy Zod env parse
        ├── email/
        │   └── resend.ts              # server-only Resend singleton
        ├── seo/
        │   ├── site-url.ts            # siteUrl() / absoluteUrl() from NEXT_PUBLIC_SITE_URL (no secrets needed)
        │   └── metadata.ts            # openGraphFor(): shared Open Graph fields
        ├── images/
        │   ├── cdn.ts                 # CDN transform URLs (email thumbnails, blur script)
        │   └── archival.ts            # maxCoverWidth / noUpscaleSizes — never upscale (§5.5)
        ├── about/
        │   ├── timeline.ts            # groupByDecade, decadeLabel (§5.4)
        │   └── press.ts               # file meta, link label, translationFor, yearAnchors (§5.6)
        ├── data/                      # server-only loaders (parse JSON with Zod)
        │   ├── artworks.ts
        │   ├── about.ts
        │   └── site.ts
        ├── gallery/
        │   ├── filters.ts
        │   └── filters.test.ts
        └── i18n/
            ├── config.ts
            ├── dictionaries.ts        # server-only
            ├── localize.ts
            ├── format.ts              # dates, numbers, plurals, interpolation
            ├── format.test.ts
            └── route.ts               # resolveLocale(params), localized hrefs, alternates
```

**Structural decisions**

| Decision | Rationale |
|---|---|
| Root layout lives at `src/app/[locale]/layout.tsx` | Allows `<html lang={locale}>` to be correct at SSR time for both locales. There is no `src/app/layout.tsx`. |
| `not-found.tsx` and `error.tsx` are Client Components reading `useI18n()` | Next 16 passes **no props** to `not-found.js`, so it cannot read `params`; both render inside the `[locale]` layout's `I18nProvider` and take their copy from `ClientMessages.notFound` / `.error`. |
| `src/proxy.ts` guarantees every request has a valid locale prefix | Makes a global (locale-less) 404 unreachable; `[...rest]` + `not-found.tsx` cover the rest. |
| `(portfolio)` and `(legacy)` route groups | Organisational boundaries; `(legacy)` scopes the About layout without affecting URLs. |
| `@modal` + `(.)works/[slug]` | Lightbox has a real, shareable URL; direct loads render the full page; back button closes the modal. |
| Schemas in `src/data/schema/` without `server-only` | The inquiry schema and filter types are shared with Client Components. Loaders in `src/lib/data/` are `server-only`. |

---

## 2. Bilingual Routing & State Specification

### 2.1 Locale configuration

```ts
// src/lib/i18n/config.ts
export const locales = ['is', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'is';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const localeMeta: Record<Locale, { htmlLang: string; intl: string; label: string }> = {
  is: { htmlLang: 'is', intl: 'is-IS', label: 'Íslenska' },
  en: { htmlLang: 'en', intl: 'en-GB', label: 'English' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}
```

### 2.2 Routing logic (`src/proxy.ts`)

Resolution order for a request **without** a valid locale prefix:

1. `NEXT_LOCALE` cookie (set when a visitor uses the language toggle) → that locale.
2. Otherwise → `is` (default & fallback). `Accept-Language` is intentionally **ignored** so Icelandic remains the canonical default for crawlers and first-time visitors; English is one click away.

Additional rules:

- Upper/mixed-case prefixes (`/IS/about`) → **308** to lowercase (`/is/about`).
- Missing prefix → **307** redirect to `/{locale}{pathname}` preserving the query string.
- Static assets, `/_next/*`, `/_vercel/*`, and any path containing a file extension (e.g. `/press/x.pdf`) are excluded by the matcher.

```ts
// src/proxy.ts
import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, isLocale, LOCALE_COOKIE } from '@/lib/i18n/config';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, first = ''] = pathname.split('/');

  if (isLocale(first)) return NextResponse.next();

  const url = request.nextUrl.clone();

  // Case normalisation: /IS/... → /is/...
  const lower = first.toLowerCase();
  if (isLocale(lower)) {
    url.pathname = pathname.replace(`/${first}`, `/${lower}`);
    return NextResponse.redirect(url, 308);
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|_vercel|.*\\..*).*)'],
};
```

> **Next.js 15.x compatibility:** rename the file to `src/middleware.ts` and the export to `middleware`. Logic is identical.

### 2.3 Layout-level locale handling

`params` is a `Promise` in Next 15+. A single helper narrows and validates it:

```ts
// src/lib/i18n/route.ts
import { notFound } from 'next/navigation';
import { isLocale, locales, defaultLocale, type Locale } from './config';

export type LocaleParams = Promise<{ locale: string }>;

export async function resolveLocale(params: LocaleParams): Promise<Locale> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return locale;
}

/** Path without locale prefix → localized path. `localizedPath('en', '/about')` → `/en/about` */
export function localizedPath(locale: Locale, path: string = ''): string {
  const clean = path === '/' ? '' : path;
  return `/${locale}${clean}`;
}

/** hreflang alternates for generateMetadata. `path` excludes the locale prefix. */
export function alternatesFor(locale: Locale, path: string = '') {
  return {
    canonical: localizedPath(locale, path),
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, localizedPath(l, path)])),
      'x-default': localizedPath(defaultLocale, path),
    },
  };
}
```

```tsx
// src/app/[locale]/layout.tsx
import type { Metadata } from 'next';
import '../globals.css';
import { serif, sans } from '../fonts';
import { locales, localeMeta } from '@/lib/i18n/config';
import { resolveLocale, alternatesFor, type LocaleParams } from '@/lib/i18n/route';
import { getDictionary, pickClientMessages } from '@/lib/i18n/dictionaries';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SkipLink } from '@/components/layout/SkipLink';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    title: { default: dict.meta.siteTitle, template: `%s — ${dict.meta.siteTitle}` },
    description: dict.meta.siteDescription,
    alternates: alternatesFor(locale),
    openGraph: { locale: localeMeta[locale].intl.replace('-', '_'), siteName: dict.meta.siteTitle, images: ['/og-default.jpg'] },
  };
}

export default async function LocaleLayout({
  children,
  modal,
  params,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
  params: LocaleParams;
}) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);

  return (
    <html lang={localeMeta[locale].htmlLang} className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-dvh bg-canvas font-sans text-body text-ink antialiased">
        <I18nProvider locale={locale} messages={pickClientMessages(dict)}>
          <SkipLink label={dict.nav.skipToContent} />
          <Header locale={locale} dict={dict} />
          <main id="main" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <Footer locale={locale} dict={dict} />
          {modal}
        </I18nProvider>
      </body>
    </html>
  );
}
```

```tsx
// src/app/[locale]/[...rest]/page.tsx
import { notFound } from 'next/navigation';
export default function CatchAll() {
  notFound();
}
```

> Leaf pages with `generateStaticParams` (`works/[slug]`, `albums/[albumId]`) keep the default `dynamicParams = true` and call `notFound()` explicitly for unknown params. This guarantees the localized `[locale]/not-found.tsx` renders rather than the framework default 404.

> **Next 16.4 behaviour (verified):** a `notFound()` thrown from a page responds `404` + `noindex`, but the server HTML is Next's minimal error shell (`<html id="__next_error__">`); the localized `not-found.tsx` (inside the full layout, with correct `<html lang>`) is rendered client-side from the RSC payload on hydration. The same happens in a minimal control app with a conventional `app/layout.js` + `app/not-found.js`, so it is framework behaviour, not this architecture. Only URLs matching *no* route get a server-rendered 404, and `proxy.ts` + `[...rest]` make that unreachable by design.

### 2.4 Dictionaries

```ts
// src/data/schema/dictionary.ts
import type { InquiryErrorCode } from './inquiry';

export interface Dictionary {
  meta: { siteTitle: string; siteDescription: string };
  languageToggle: { label: string; ariaLabel: string };   // Text is in the TARGET language
  nav: { works: string; about: string; biography: string; exhibitions: string; albums: string; press: string; skipToContent: string; primary: string; aboutSections: string };
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
    close: string; previous: string; next: string;
    year: string; medium: string; dimensions: string; catalogueId: string;
    circa: string; undated: string;
    reprintAvailable: string; buyReprint: string;
    mat: { label: string; light: string; dark: string };
    openFullPage: string;
  };
  inquiry: {
    heading: string; intro: string; regarding: string;
    name: string; email: string; message: string; messagePlaceholder: string;
    submit: string; submitting: string; back: string;
    successTitle: string; successBody: string;
    privacyNote: string;
    errors: Record<InquiryErrorCode, string>;
  };
  about: {
    heading: string;
    biography: { portraitCredit: string; born: string; died: string };
    exhibitions: { heading: string; intro: string; solo: string; group: string; photoAlbum: string };
    albums: {
      heading: string; intro: string; photoCount: { one: string; other: string }; close: string; previous: string; next: string;
      fromExhibition: string;   // {title}
      photoOf: string;          // {index} {total}
    };
    press: { heading: string; intro: string; page: string; open: string; fileTypes: { pdf: string; image: string }; translatedHeadline: string; jumpToYear: string };
  };
  footer: { facebook: string; opensInNewTab: string; rights: string };
  notFound: { title: string; body: string; home: string };
  error: { title: string; retry: string };
}
```

```ts
// src/lib/i18n/dictionaries.ts
import 'server-only';
import is from '@/data/dictionaries/is.json';
import en from '@/data/dictionaries/en.json';
import type { Dictionary } from '@/data/schema/dictionary';
import type { Locale } from './config';

// `satisfies` makes a missing/renamed key in either JSON a compile error.
const dictionaries = {
  is: is satisfies Dictionary,
  en: en satisfies Dictionary,
} as const;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/**
 * Only the namespaces Client Components need are serialized to the browser.
 * `notFound` / `error` are included because not-found.tsx receives no params and error.tsx must be
 * a Client Component — both read their copy from the I18nProvider.
 */
export type ClientMessages = Pick<
  Dictionary,
  'languageToggle' | 'nav' | 'gallery' | 'lightbox' | 'inquiry' | 'about' | 'notFound' | 'error'
>;

export function pickClientMessages(d: Dictionary): ClientMessages {
  return {
    languageToggle: d.languageToggle, nav: d.nav, gallery: d.gallery, lightbox: d.lightbox,
    inquiry: d.inquiry, about: d.about, notFound: d.notFound, error: d.error,
  };
}
```

```json
// src/data/dictionaries/is.json
{
  "meta": {
    "siteTitle": "Brynja Árnadóttir",
    "siteDescription": "Stafrænt safn penna­teikninga eftir Brynju Árnadóttur (1942–2025)."
  },
  "languageToggle": { "label": "English", "ariaLabel": "View this page in English" },
  "nav": {
    "works": "Verk",
    "about": "Um listamanninn",
    "biography": "Æviágrip",
    "exhibitions": "Sýningar",
    "albums": "Myndaalbúm",
    "press": "Fjölmiðlar",
    "skipToContent": "Fara beint í efni",
    "primary": "Aðalvalmynd",
    "aboutSections": "Kaflar um listamanninn"
  },
  "hero": { "eyebrow": "Pennateikningar", "tagline": "Ævistarf í bleki — svarthvítt og í lit." },
  "gallery": {
    "heading": "Verk",
    "filtersLegend": "Sía verk",
    "color": { "label": "Litur", "all": "Öll", "black-and-white": "Svarthvít", "colorful": "Í lit" },
    "availability": { "label": "Framboð", "all": "Öll verk", "reprints": "Aðeins eftirprent" },
    "resultCount": { "one": "{count} verk", "other": "{count} verk" },
    "empty": "Engin verk passa við valda síu.",
    "reset": "Hreinsa síu"
  },
  "lightbox": {
    "close": "Loka",
    "previous": "Fyrra verk",
    "next": "Næsta verk",
    "year": "Ár",
    "medium": "Efni",
    "dimensions": "Stærð",
    "catalogueId": "Skráningarnúmer",
    "circa": "um",
    "undated": "Ódagsett",
    "reprintAvailable": "Fáanlegt sem eftirprent",
    "buyReprint": "Kaupa eftirprent",
    "mat": { "label": "Bakgrunnur", "light": "Ljós", "dark": "Dökkur" },
    "openFullPage": "Opna sem síðu"
  },
  "inquiry": {
    "heading": "Fyrirspurn um eftirprent",
    "intro": "Fylltu út formið og við höfum samband með upplýsingar um stærðir, pappír og verð.",
    "regarding": "Varðandi verkið",
    "name": "Nafn",
    "email": "Netfang",
    "message": "Skilaboð",
    "messagePlaceholder": "Til dæmis óskastærð eða spurningar um innrömmun.",
    "submit": "Senda fyrirspurn",
    "submitting": "Sendi…",
    "back": "Til baka",
    "successTitle": "Takk fyrir!",
    "successBody": "Fyrirspurnin hefur verið send. Við svörum eins fljótt og auðið er.",
    "privacyNote": "Upplýsingarnar eru eingöngu notaðar til að svara fyrirspurninni.",
    "errors": {
      "name_required": "Vinsamlegast sláðu inn nafn.",
      "name_too_short": "Nafn þarf að vera að minnsta kosti 2 stafir.",
      "name_too_long": "Nafn má ekki vera lengra en 120 stafir.",
      "email_required": "Vinsamlegast sláðu inn netfang.",
      "email_too_long": "Netfangið er of langt.",
      "email_invalid": "Netfangið virðist ekki vera gilt.",
      "message_required": "Vinsamlegast skrifaðu skilaboð.",
      "message_too_short": "Skilaboð þurfa að vera að minnsta kosti 10 stafir.",
      "message_too_long": "Skilaboð mega ekki vera lengri en 4000 stafir.",
      "artwork_invalid": "Ekki tókst að tengja fyrirspurnina við verk. Endurhladdu síðuna og reyndu aftur.",
      "artwork_unavailable": "Þetta verk er því miður ekki lengur fáanlegt sem eftirprent.",
      "submission_too_fast": "Vinsamlegast bíddu augnablik og reyndu aftur.",
      "send_failed": "Ekki tókst að senda fyrirspurnina. Reyndu aftur síðar eða hafðu samband í gegnum Facebook.",
      "unknown": "Ógilt gildi."
    }
  },
  "about": {
    "heading": "Um listamanninn",
    "biography": { "portraitCredit": "Ljósmynd", "born": "Fædd(ur)", "died": "Dáin(n)" },
    "exhibitions": { "heading": "Sýningarferill", "intro": "Einka- og samsýningar í tímaröð.", "solo": "Einkasýning", "group": "Samsýning", "photoAlbum": "Myndaalbúm" },
    "albums": {
      "heading": "Myndaalbúm",
      "intro": "Ljósmyndir frá sýningaropnunum og vinnustofu.",
      "photoCount": { "one": "{count} mynd", "other": "{count} myndir" },
      "close": "Loka",
      "previous": "Fyrri mynd",
      "next": "Næsta mynd",
      "fromExhibition": "Frá sýningunni {title}",
      "photoOf": "{index} af {total}"
    },
    "press": {
      "heading": "Fjölmiðlar",
      "intro": "Úrklippur og greinar úr blöðum og tímaritum.",
      "page": "bls.",
      "open": "Opna úrklippu",
      "fileTypes": { "pdf": "PDF", "image": "Mynd" },
      "translatedHeadline": "Þýðing fyrirsagnar",
      "jumpToYear": "Fara í ár"
    }
  },
  "footer": { "facebook": "Opinber Facebook-síða", "opensInNewTab": "(opnast í nýjum flipa)", "rights": "© Allur réttur áskilinn." },
  "notFound": { "title": "Síða fannst ekki", "body": "Síðan sem þú leitar að er ekki til eða hefur verið færð.", "home": "Aftur á forsíðu" },
  "error": { "title": "Eitthvað fór úrskeiðis", "retry": "Reyna aftur" }
}
```

```json
// src/data/dictionaries/en.json
{
  "meta": {
    "siteTitle": "Brynja Árnadóttir",
    "siteDescription": "A digital archive of pen drawings by Brynja Árnadóttir (1942–2025)."
  },
  "languageToggle": { "label": "Íslenska", "ariaLabel": "Skoða þessa síðu á íslensku" },
  "nav": {
    "works": "Works",
    "about": "About the artist",
    "biography": "Biography",
    "exhibitions": "Exhibitions",
    "albums": "Photo albums",
    "press": "Press",
    "skipToContent": "Skip to content",
    "primary": "Primary navigation",
    "aboutSections": "About sections"
  },
  "hero": { "eyebrow": "Pen drawings", "tagline": "A lifetime in ink — monochrome and colour." },
  "gallery": {
    "heading": "Works",
    "filtersLegend": "Filter works",
    "color": { "label": "Colour", "all": "All", "black-and-white": "Black & white", "colorful": "Colour" },
    "availability": { "label": "Availability", "all": "All works", "reprints": "Only reprints" },
    "resultCount": { "one": "{count} work", "other": "{count} works" },
    "empty": "No works match the selected filters.",
    "reset": "Clear filters"
  },
  "lightbox": {
    "close": "Close",
    "previous": "Previous work",
    "next": "Next work",
    "year": "Year",
    "medium": "Medium",
    "dimensions": "Dimensions",
    "catalogueId": "Catalogue no.",
    "circa": "c.",
    "undated": "Undated",
    "reprintAvailable": "Available as a reprint",
    "buyReprint": "Buy a Reprint",
    "mat": { "label": "Background", "light": "Light", "dark": "Dark" },
    "openFullPage": "Open as page"
  },
  "inquiry": {
    "heading": "Reprint inquiry",
    "intro": "Fill in the form and we will get back to you with sizes, paper options and pricing.",
    "regarding": "Regarding",
    "name": "Name",
    "email": "Email",
    "message": "Message",
    "messagePlaceholder": "For example a preferred size or framing questions.",
    "submit": "Send inquiry",
    "submitting": "Sending…",
    "back": "Back",
    "successTitle": "Thank you!",
    "successBody": "Your inquiry has been sent. We will reply as soon as possible.",
    "privacyNote": "Your details are used only to respond to this inquiry.",
    "errors": {
      "name_required": "Please enter your name.",
      "name_too_short": "Name must be at least 2 characters.",
      "name_too_long": "Name must be at most 120 characters.",
      "email_required": "Please enter your email address.",
      "email_too_long": "That email address is too long.",
      "email_invalid": "That email address doesn't look valid.",
      "message_required": "Please write a message.",
      "message_too_short": "Message must be at least 10 characters.",
      "message_too_long": "Message must be at most 4000 characters.",
      "artwork_invalid": "We couldn't link your inquiry to an artwork. Please reload and try again.",
      "artwork_unavailable": "Sorry — this work is no longer available as a reprint.",
      "submission_too_fast": "Please wait a moment and try again.",
      "send_failed": "We couldn't send your inquiry. Please try again later or contact us via Facebook.",
      "unknown": "Invalid value."
    }
  },
  "about": {
    "heading": "About the artist",
    "biography": { "portraitCredit": "Photo", "born": "Born", "died": "Died" },
    "exhibitions": { "heading": "Exhibition history", "intro": "Solo and group exhibitions in chronological order.", "solo": "Solo exhibition", "group": "Group exhibition", "photoAlbum": "Photo album" },
    "albums": {
      "heading": "Photo albums",
      "intro": "Photographs from exhibition openings and the studio.",
      "photoCount": { "one": "{count} photo", "other": "{count} photos" },
      "close": "Close",
      "previous": "Previous photo",
      "next": "Next photo",
      "fromExhibition": "From the exhibition {title}",
      "photoOf": "{index} of {total}"
    },
    "press": {
      "heading": "Press",
      "intro": "Clippings and articles from newspapers and magazines.",
      "page": "p.",
      "open": "Open clipping",
      "fileTypes": { "pdf": "PDF", "image": "Image" },
      "translatedHeadline": "Translated headline",
      "jumpToYear": "Jump to year"
    }
  },
  "footer": { "facebook": "Official Facebook Page", "opensInNewTab": "(opens in a new tab)", "rights": "© All rights reserved." },
  "notFound": { "title": "Page not found", "body": "The page you are looking for doesn't exist or has moved.", "home": "Back to home" },
  "error": { "title": "Something went wrong", "retry": "Try again" }
}
```

### 2.5 Localisation & formatting helpers

```ts
// src/data/schema/shared.ts
import { z } from 'zod';
import type { Locale } from '@/lib/i18n/config';

export type Localized<T = string> = Record<Locale, T>;

export const localizedString = z.strictObject({ is: z.string().min(1), en: z.string().min(1) });
export const localizedStringList = z.strictObject({ is: z.array(z.string().min(1)).min(1), en: z.array(z.string().min(1)).min(1) });

/** ISO partial date: "1968" | "1968-03" | "1968-03-15" — sorts correctly as a string. */
export const partialDate = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/);

export const cdnImage = z.strictObject({
  src: z.url({ protocol: /^https$/ }),
  width: z.int().positive(),
  height: z.int().positive(),
  blurDataURL: z.string().startsWith('data:image/').optional(),
  alt: localizedString,
});
export type CdnImage = z.infer<typeof cdnImage>;

/** superRefine callback for arrays: `Duplicate <key>: <value>` at `[index, key]`. */
export function uniqueKeys<T, K extends keyof T & string>(...keys: K[]) {
  return (list: readonly T[], ctx: z.RefinementCtx) => {
    for (const key of keys) {
      const seen = new Set<unknown>();
      list.forEach((item, i) => {
        if (seen.has(item[key])) ctx.addIssue({ code: 'custom', path: [i, key], message: `Duplicate ${key}: ${String(item[key])}` });
        seen.add(item[key]);
      });
    }
  };
}
```

```ts
// src/lib/i18n/localize.ts
import { defaultLocale, type Locale } from './config';
import type { Localized } from '@/data/schema/shared';

/** Returns the value for `locale`, falling back to Icelandic if empty/missing. */
export function localize<T>(value: Localized<T>, locale: Locale): T {
  const v = value[locale];
  if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) return value[defaultLocale];
  return v;
}
```

```ts
// src/lib/i18n/format.ts
import { localeMeta, type Locale } from './config';

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

export function plural(locale: Locale, count: number, forms: { one: string; other: string }): string {
  const rule = new Intl.PluralRules(localeMeta[locale].intl).select(count);
  return interpolate(rule === 'one' ? forms.one : forms.other, { count });
}

/** Formats "1968" | "1968-03" | "1968-03-15" without timezone drift (always UTC). */
export function formatPartialDate(iso: string, locale: Locale): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y) return iso;
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  const opts: Intl.DateTimeFormatOptions =
    d ? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
    : m ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
    : { year: 'numeric', timeZone: 'UTC' };
  return new Intl.DateTimeFormat(localeMeta[locale].intl, opts).format(date);
}

/** 29.7 → "29,7" (is) / "29.7" (en). */
export function formatCm(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeMeta[locale].intl, { maximumFractionDigits: 1 }).format(value);
}

export function formatDimensions(w: number, h: number, locale: Locale): string {
  return `${formatCm(w, locale)} × ${formatCm(h, locale)} cm`;
}
```

### 2.6 Client i18n context

```tsx
// src/components/providers/I18nProvider.tsx
'use client';

import { createContext, use } from 'react';
import type { Locale } from '@/lib/i18n/config';
import type { ClientMessages } from '@/lib/i18n/dictionaries';

interface I18nValue {
  locale: Locale;
  messages: ClientMessages;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, messages, children }: I18nValue & { children: React.ReactNode }) {
  return <I18nContext value={{ locale, messages }}>{children}</I18nContext>;
}

export function useI18n(): I18nValue {
  const ctx = use(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
```

> `ClientMessages` is imported as a **type only** from a `server-only` module; type imports are erased and do not pull server code into the client bundle. Use `import type`.

### 2.7 Header language toggle — state specification

**State model: the URL is the single source of truth.** There is no client store for the active locale.

| Concern | Source |
|---|---|
| Current locale | `useI18n().locale` (from the `[locale]` segment via the root layout) |
| Target locale | The other member of `locales` |
| Target URL | Current `pathname` with segment 1 swapped + current search params (filters survive the switch) |
| Persistence | `NEXT_LOCALE` cookie written on click (1 year, `SameSite=Lax`), read by `proxy.ts` for prefix-less visits |
| Transition | Soft navigation via `<Link>` (same root layout file, different param) — no full reload |

Requirements:

- Rendered as a real `<Link>` (crawlable), with `hrefLang` and `lang` set to the target locale and the label written in the target language ("English" on `/is/*`, "Íslenska" on `/en/*`).
- `scroll={false}` so the reader keeps their position.
- `useSearchParams()` requires a `<Suspense>` boundary on statically rendered routes. The Header wraps the toggle in `<Suspense>` whose fallback (`LanguageToggleStatic`) is the same link **without** search params.

```tsx
// src/components/layout/LanguageToggle.tsx
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { locales, LOCALE_COOKIE, type Locale } from '@/lib/i18n/config';
import { useI18n } from '@/components/providers/I18nProvider';

/** `/is/about/press` → `/en/about/press`. */
export function swapLocale(pathname: string, target: Locale): string {
  const segments = pathname.split('/');
  segments[1] = target;
  return segments.join('/') || `/${target}`;
}

/** Target URL: current path with the locale swapped, plus the current query (filters survive). */
export function toggleHref(pathname: string, target: Locale, query = ''): string {
  return `${swapLocale(pathname, target)}${query ? `?${query}` : ''}`;
}

function persist(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function useTarget(): Locale {
  const { locale } = useI18n();
  return locales.find((l) => l !== locale) as Locale;
}

function ToggleLink({ href, target }: { href: string; target: Locale }) {
  const { messages } = useI18n();
  return (
    <Link
      href={href}
      hrefLang={target}
      lang={target}
      scroll={false}
      onClick={() => persist(target)}
      aria-label={messages.languageToggle.ariaLabel}
      className="text-caption tracking-[0.14em] text-ink-muted uppercase underline-offset-4 transition-colors hover:text-ink hover:underline"
    >
      {messages.languageToggle.label}
    </Link>
  );
}

/** Preserves the query string. Reads `useSearchParams()`, so it must sit inside `<Suspense>`. */
export function LanguageToggle() {
  const target = useTarget();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <ToggleLink href={toggleHref(pathname, target, searchParams.toString())} target={target} />
  );
}

/** Suspense fallback / static render: same link without the query string. */
export function LanguageToggleStatic() {
  const target = useTarget();
  const pathname = usePathname();
  return <ToggleLink href={toggleHref(pathname, target)} target={target} />;
}
```

> Split into `LanguageToggle` (calls `useSearchParams`) and `LanguageToggleStatic` (Suspense fallback) sharing a presentational `<ToggleLink>`, so no hook is called conditionally.

```tsx
// src/components/layout/Header.tsx (excerpt)
import Link from 'next/link';
import { Suspense } from 'react';
import { LanguageToggle, LanguageToggleStatic } from './LanguageToggle';
import { NavLinks } from './NavLinks';
import { localizedPath } from '@/lib/i18n/route';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/data/schema/dictionary';

export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-canvas/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-wide items-center justify-between gap-gutter px-gutter">
        <Link href={localizedPath(locale)} className="font-serif text-lede tracking-tight">
          {dict.meta.siteTitle}
        </Link>
        <nav aria-label={dict.nav.primary} className="flex items-center gap-6">
          <NavLinks
            items={[
              { href: localizedPath(locale), label: dict.nav.works, match: 'exact' },
              { href: localizedPath(locale, '/about'), label: dict.nav.about, match: 'prefix' },
            ]}
          />
          <span aria-hidden className="h-4 w-px bg-rule-strong" />
          <Suspense fallback={<LanguageToggleStatic />}>
            <LanguageToggle />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
```

`NavLinks` (client) uses `usePathname()` to set `aria-current="page"` and the `aria-[current=page]:text-ink` style.

---

## 3. Portfolio Data Schema & Gallery State Logic

### 3.1 `Artwork` interface (source of truth)

```ts
// src/data/schema/artwork.ts
import { z } from 'zod';
import { cdnImage, localizedString, uniqueKeys, type CdnImage, type Localized } from './shared';

export const STYLE_CATEGORIES = ['black-and-white', 'colorful'] as const;
export type StyleCategory = (typeof STYLE_CATEGORIES)[number];

export interface ArtworkDimensions {
  /** Physical sheet/image size of the original drawing, in centimetres. */
  widthCm: number;
  heightCm: number;
}

export interface Artwork {
  /** Stable catalogue ID. Never reuse or renumber. Format: ART-0001 */
  id: string;
  /** URL segment, shared by both locales. Lowercase kebab-case, unique. */
  slug: string;
  title: Localized;
  /** Master image on the CDN. `width`/`height` are the master's intrinsic PIXEL dimensions. */
  image: CdnImage;
  /** Physical dimensions of the original artwork. */
  dimensions: ArtworkDimensions;
  /** Year of creation; `null` if undated. */
  year: number | null;
  /** Renders as "c. 1972" / "um 1972". */
  yearCirca?: boolean;
  styleCategory: StyleCategory;
  /** Whether the estate offers reprints of this work. Key name is contractual — keep the hyphens. */
  'available-as-reprint': boolean;
  medium: Localized;
  description?: Localized;
  /** Lower = earlier in default ordering within the same year. */
  sortOrder?: number;
}

export const artworkSchema = z.strictObject({
  id: z.string().regex(/^ART-\d{4}$/),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: localizedString,
  image: cdnImage,
  dimensions: z.strictObject({ widthCm: z.number().positive(), heightCm: z.number().positive() }),
  year: z.int().min(1900).max(2100).nullable(),
  yearCirca: z.boolean().optional(),
  styleCategory: z.enum(STYLE_CATEGORIES),
  'available-as-reprint': z.boolean(),
  medium: localizedString,
  description: localizedString.optional(),
  sortOrder: z.int().optional(),
}) satisfies z.ZodType<Artwork>;

export const artworkListSchema = z.array(artworkSchema).superRefine(uniqueKeys('id', 'slug'));

/** Lean, localized projection sent to Client Components. */
export interface GalleryItem {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  yearCirca: boolean;
  styleCategory: StyleCategory;
  reprint: boolean;
  image: { src: string; width: number; height: number; blurDataURL?: string; alt: string };
}

/** Minimal ordering index for lightbox prev/next (no titles, no images). */
export interface NavIndexEntry {
  slug: string;
  styleCategory: StyleCategory;
  reprint: boolean;
}
```

> Access the contractual key with bracket notation: `artwork['available-as-reprint']`. The projection layer renames it to `reprint` so Client Components stay idiomatic.

### 3.2 `artworks.json` example

```json
[
  {
    "id": "ART-0001",
    "slug": "hraun-vid-sjo",
    "title": { "is": "Hraun við sjó", "en": "Lava by the Sea" },
    "image": {
      "src": "https://brynja.b-cdn.net/v1/archive/works/ART-0001.jpg",
      "width": 3000,
      "height": 2121,
      "blurDataURL": "data:image/webp;base64,UklGRkIAAABXRUJQVlA4IDYAAADQAQCdASoQAAsAAUAmJYwCdAEO/gHOAAD++Z3/+H/v4f/5/n//8B/+wP/sAAA=",
      "alt": {
        "is": "Þéttskyggð pennateikning af úfnu hrauni sem mætir brimi.",
        "en": "Densely hatched pen drawing of rugged lava meeting the surf."
      }
    },
    "dimensions": { "widthCm": 42, "heightCm": 29.7 },
    "year": 1978,
    "styleCategory": "black-and-white",
    "available-as-reprint": true,
    "medium": { "is": "Tússpenni á pappír", "en": "Ink pen on paper" },
    "sortOrder": 10
  },
  {
    "id": "ART-0002",
    "slug": "midnaetursol-i-firdi",
    "title": { "is": "Miðnætursól í firði", "en": "Midnight Sun in a Fjord" },
    "image": {
      "src": "https://brynja.b-cdn.net/v1/archive/works/ART-0002.jpg",
      "width": 2400,
      "height": 3000,
      "alt": {
        "is": "Litrík bleklína sem dregur upp fjörð undir appelsínugulum himni.",
        "en": "Vivid ink lines describing a fjord beneath an orange sky."
      }
    },
    "dimensions": { "widthCm": 30, "heightCm": 40 },
    "year": 1986,
    "yearCirca": true,
    "styleCategory": "colorful",
    "available-as-reprint": false,
    "medium": { "is": "Litaður tússpenni á pappír", "en": "Coloured ink pen on paper" }
  }
]
```

### 3.3 Image pipeline

**Bunny.net setup**

| Item | Configuration |
|---|---|
| Storage Zone | `brynja-storage` (single region close to Iceland/EU, e.g. Falkenstein or Stockholm; optional geo-replication) |
| Pull Zone | `brynja` → origin = the Storage Zone; hostname `brynja.b-cdn.net` (optionally a custom hostname such as `cdn.brynja-arnadottir.is` with Bunny-issued TLS — then update `remotePatterns` and the JSON URLs) |
| Folder layout | `/v1/archive/works/ART-0001.jpg`, `/v1/archive/about/…`, `/v1/archive/albums/<albumId>/…` |
| Cache | Pull Zone cache expiration: 1 year; browser cache: respect origin / 1 year. Files are immutable: to replace an image, upload under a new version prefix (`/v2/…`) or new filename and update the JSON — never overwrite in place (avoids purge races with Vercel's image cache) |
| Bunny Optimizer | **Enabled** on the Pull Zone, used only for query-string resizing (`?width=&quality=`) in emails, OG tags and the blur script. **Disable** "Automatic WebP/AVIF conversion": Vercel's optimizer handles modern formats for the site, and email clients need JPEG |
| Hotlink protection | Optional: allowed referrers `brynja-arnadottir.is` plus *empty referrer* (required — Vercel's image optimizer and mail-client image proxies fetch without a Referer) |
| Upload | Bunny dashboard file manager, FTP, or Storage API (`PUT https://storage.bunnycdn.com/<zone>/<path>` with `AccessKey` header). The Storage password is a deploy-time secret and is **never** added to the Next.js app or Vercel env |

**Upload policy.** The Storage Zone holds *web masters* only: sRGB JPEG, 3000 px long edge, quality ≥ 92, no watermark. Print-resolution scans stay offline with the estate. (`next/image` exposes the source URL in the `/_next/image?url=` query, so anything on the Pull Zone is effectively public.)

**`next.config.ts`**

```ts
import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Tailwind v4 under Turbopack (create-next-app 16.4 default; replaces postcss.config.mjs).
  turbopack: {
    rules: { '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' } },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Whole pull zone: the current masters sit at the zone root (e.g. `/Brj%C3%B3st%2050x35.jpg`).
      // The `/v1/archive/…` folder layout above is the target, not yet in use; once every JSON URL
      // has moved there this can tighten to `pathname: '/v*/archive/**'`.
      { protocol: 'https', hostname: 'brynja.b-cdn.net', pathname: '/**' },
      // Custom hostname variant: { protocol: 'https', hostname: 'cdn.brynja-arnadottir.is', pathname: '/**' },
    ],
    deviceSizes: [640, 828, 1080, 1280, 1600, 1920, 2560],
    imageSizes: [128, 256, 384, 480],
    qualities: [70, 75, 90], // Next 16 rejects any `quality` prop not listed here
    minimumCacheTTL: 60 * 60 * 24 * 31, // 31 days; masters are immutable (versioned URLs)
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        source: '/press/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
```

> CSP note: a nonce-based CSP forces dynamic rendering of every page, which defeats static generation. `'unsafe-inline'` for scripts is the accepted trade-off for a static, form-light site with no user-generated HTML. All images are served via `/_next/image` (same origin), so the Bunny hostname does not need to appear in `img-src`.
>
> Zod 4 probes `new Function('')` on first parse to decide whether to JIT-compile object schemas. The inquiry schema runs in the browser, so without `'unsafe-eval'` the probe fails safely but Chromium logs a `script-src` CSP violation. `src/data/schema/inquiry.ts` therefore calls `z.config({ jitless: true })`. Do not add `'unsafe-eval'` in production instead.

**Quality tiers (must match `images.qualities`)**

| Context | `quality` | `sizes` |
|---|---|---|
| Gallery card | 75 | `(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw` |
| Lightbox / full page | 90 (fine pen hatching degrades visibly below ~85) | `(min-width: 1024px) calc(100vw - 26rem), 100vw` |
| Archival album thumbnails | 70 | see §5.3 |

**Blur placeholders** — generated offline, committed to JSON:

```ts
// scripts/generate-blur-placeholders.ts
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { bunnyTransform } from '../src/lib/images/cdn';

const FILES = ['src/data/artworks.json', 'src/data/about/albums.json', 'src/data/about/biography.json'];

async function toBlur(src: string): Promise<string> {
  // Ask Bunny Optimizer for a tiny JPEG instead of downloading the 3000px master.
  const res = await fetch(bunnyTransform(src, { width: 64, quality: 70 }));
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${src}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = await sharp(buf).resize(16, 16, { fit: 'inside' }).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${out.toString('base64')}`;
}

/** Walks any JSON tree; fills `blurDataURL` on objects that have `src` + `width` + `height`. */
export async function walk(node: unknown, force: boolean, blur: (src: string) => Promise<string>): Promise<void> {
  if (Array.isArray(node)) { for (const n of node) await walk(n, force, blur); return; }
  if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if (typeof o.src === 'string' && typeof o.width === 'number' && typeof o.height === 'number' && (force || !o.blurDataURL)) {
      o.blurDataURL = await blur(o.src);
      console.log('✓', o.src);
    }
    for (const v of Object.values(o)) await walk(v, force, blur);
  }
}

if (isMain(import.meta.url)) {           // scripts/lib/is-main.ts — lets tests import `walk`
  const force = process.argv.includes('--force');
  const blur = memoize(toBlur);          // the same src (e.g. portrait reused in an album) is fetched once
  for (const file of FILES) {
    const before = await readFile(file, 'utf8');
    const json = JSON.parse(before);
    await walk(json, force, blur);
    const after = `${JSON.stringify(json, null, 2)}\n`;
    if (after !== before) await writeFile(file, after);   // no churn when nothing changed
  }
}
```

Data JSON is committed in `JSON.stringify(…, null, 2)` layout (Prettier keeps it), so running the script only adds `blurDataURL` lines.

When `blurDataURL` is absent, components fall back to `placeholder="empty"` and the `bg-mat` box reserves space (no CLS either way because `width`/`height` are always present).

### 3.4 Data loader

```ts
// src/lib/data/artworks.ts
import 'server-only';
import raw from '@/data/artworks.json';
import { artworkListSchema, type Artwork, type GalleryItem, type NavIndexEntry } from '@/data/schema/artwork';
import { localize } from '@/lib/i18n/localize';
import type { Locale } from '@/lib/i18n/config';

function compare(a: Artwork, b: Artwork): number {
  // Newest first; undated last; then sortOrder; then id.
  const ay = a.year ?? -Infinity;
  const by = b.year ?? -Infinity;
  if (ay !== by) return by - ay;
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id);
}

// Parsed once at module load → invalid JSON fails `next build`.
const artworks: readonly Artwork[] = artworkListSchema.parse(raw).toSorted(compare);
const bySlug = new Map(artworks.map((a) => [a.slug, a]));
const byId = new Map(artworks.map((a) => [a.id, a]));

export const getAllArtworks = (): readonly Artwork[] => artworks;
export const getArtworkBySlug = (slug: string): Artwork | undefined => bySlug.get(slug);
export const getArtworkById = (id: string): Artwork | undefined => byId.get(id);

export function toGalleryItem(a: Artwork, locale: Locale): GalleryItem {
  return {
    id: a.id,
    slug: a.slug,
    title: localize(a.title, locale),
    year: a.year,
    yearCirca: a.yearCirca ?? false,
    styleCategory: a.styleCategory,
    reprint: a['available-as-reprint'],
    image: {
      src: a.image.src,
      width: a.image.width,
      height: a.image.height,
      blurDataURL: a.image.blurDataURL,
      alt: localize(a.image.alt, locale),
    },
  };
}

export function getNavIndex(): NavIndexEntry[] {
  return artworks.map((a) => ({ slug: a.slug, styleCategory: a.styleCategory, reprint: a['available-as-reprint'] }));
}
```

### 3.5 Filter domain logic (pure, unit-tested)

URL contract (defaults are omitted from the URL):

| Filter | Param | Values | Default |
|---|---|---|---|
| Color Profile | `ink` | `bw` → `black-and-white`, `color` → `colorful` | absent = All |
| Availability | `reprints` | `1` | absent = All |

Examples: `/is?ink=bw`, `/en?ink=color&reprints=1`.

```ts
// src/lib/gallery/filters.ts
import type { StyleCategory } from '@/data/schema/artwork';

export type ColorFilter = 'all' | StyleCategory;
export type AvailabilityFilter = 'all' | 'reprints';

export interface GalleryFilters {
  color: ColorFilter;
  availability: AvailabilityFilter;
}

export const DEFAULT_FILTERS: GalleryFilters = { color: 'all', availability: 'all' };

export interface Filterable {
  styleCategory: StyleCategory;
  reprint: boolean;
}

const INK_TO_COLOR: Record<string, StyleCategory> = { bw: 'black-and-white', color: 'colorful' };
const COLOR_TO_INK: Record<StyleCategory, string> = { 'black-and-white': 'bw', colorful: 'color' };

type ParamsLike = Pick<URLSearchParams, 'get'>;

/** Whitelist parse — unknown values silently fall back to defaults. */
export function parseFilters(params: ParamsLike | null | undefined): GalleryFilters {
  const ink = params?.get('ink') ?? '';
  return {
    // hasOwn guard: `?ink=constructor` / `?ink=toString` must not resolve to inherited Object.prototype members.
    color: Object.hasOwn(INK_TO_COLOR, ink) ? (INK_TO_COLOR[ink] ?? 'all') : 'all',
    availability: params?.get('reprints') === '1' ? 'reprints' : 'all',
  };
}

export function serializeFilters(f: GalleryFilters): string {
  const p = new URLSearchParams();
  if (f.color !== 'all') p.set('ink', COLOR_TO_INK[f.color]);
  if (f.availability === 'reprints') p.set('reprints', '1');
  return p.toString();
}

export function matchesFilters(item: Filterable, f: GalleryFilters): boolean {
  const colorOk = f.color === 'all' || item.styleCategory === f.color;
  const availabilityOk = f.availability === 'all' || item.reprint;
  return colorOk && availabilityOk; // Combined filter = logical AND
}

export function filterItems<T extends Filterable>(items: readonly T[], f: GalleryFilters): T[] {
  return items.filter((i) => matchesFilters(i, f));
}

/** Facet counts: each facet's counts respect the OTHER facet's current value. */
export function facetCounts(items: readonly Filterable[], f: GalleryFilters) {
  const color = { all: 0, 'black-and-white': 0, colorful: 0 } satisfies Record<ColorFilter, number>;
  const availability = { all: 0, reprints: 0 } satisfies Record<AvailabilityFilter, number>;
  for (const i of items) {
    if (f.availability === 'all' || i.reprint) { color.all++; color[i.styleCategory]++; }
    if (f.color === 'all' || i.styleCategory === f.color) { availability.all++; if (i.reprint) availability.reprints++; }
  }
  return { color, availability };
}

export const isDefaultFilters = (f: GalleryFilters) => f.color === 'all' && f.availability === 'all';
```

**Required tests (`filters.test.ts`)**: parse of every valid/invalid param combination; serialize omits defaults; round-trip `parse(serialize(f)) ≡ f` for all 6 combinations; AND semantics; facet counts against a 6-item fixture covering all four `(category × reprint)` cells.

### 3.6 Gallery Client Component

**State model**

- URL search params are the single source of truth (shareable, survives refresh, survives language switch and lightbox open/close).
- Updates use `window.history.replaceState` — Next.js syncs native History API calls into `useSearchParams()`, so no RSC round-trip and no history entry per click.
- Derived data (`visible`, `counts`) via `useMemo`. No `useState` mirror of the URL.

**Static rendering & SEO**: the page is statically generated. Because `Gallery` reads `useSearchParams()`, it is wrapped in `<Suspense>` whose fallback is the **server-rendered unfiltered `<ArtworkGrid>`**. Crawlers and first paint get every artwork; filters hydrate on top.

```tsx
// src/app/[locale]/(portfolio)/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { resolveLocale, alternatesFor, type LocaleParams } from '@/lib/i18n/route';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getAllArtworks, toGalleryItem } from '@/lib/data/artworks';
import { Hero } from '@/components/home/Hero';
import { Gallery } from '@/components/gallery/Gallery';
import { ArtworkGrid } from '@/components/gallery/ArtworkGrid';

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { title: getDictionary(locale).gallery.heading, alternates: alternatesFor(locale) };
}

export default async function HomePage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const items = getAllArtworks().map((a) => toGalleryItem(a, locale));

  return (
    <>
      <Hero locale={locale} dict={dict} />
      <section aria-labelledby="works-heading" className="mx-auto max-w-gallery px-gutter pb-section">
        <h2 id="works-heading" className="sr-only">{dict.gallery.heading}</h2>
        <Suspense fallback={<ArtworkGrid items={items} locale={locale} query="" />}>
          <Gallery items={items} />
        </Suspense>
      </section>
    </>
  );
}
```

```tsx
// src/components/gallery/Gallery.tsx
'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { GalleryItem } from '@/data/schema/artwork';
import {
  DEFAULT_FILTERS, facetCounts, filterItems, isDefaultFilters,
  parseFilters, serializeFilters, type GalleryFilters,
} from '@/lib/gallery/filters';
import { useI18n } from '@/components/providers/I18nProvider';
import { plural } from '@/lib/i18n/format';
import { GalleryFilters as Filters } from './GalleryFilters';
import { ArtworkGrid } from './ArtworkGrid';
import { EmptyState } from './EmptyState';

export function Gallery({ items }: { items: GalleryItem[] }) {
  const { locale, messages } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const query = useMemo(() => serializeFilters(filters), [filters]);
  const visible = useMemo(() => filterItems(items, filters), [items, filters]);
  const counts = useMemo(() => facetCounts(items, filters), [items, filters]);

  const update = useCallback(
    (patch: Partial<GalleryFilters>) => {
      const qs = serializeFilters({ ...filters, ...patch });
      window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
    },
    [filters, pathname],
  );

  return (
    <div className="flex flex-col gap-stack">
      <div className="flex flex-col gap-4 border-y border-rule py-4 md:flex-row md:items-center md:justify-between">
        <Filters filters={filters} counts={counts} onChange={update} />
        <p role="status" aria-live="polite" className="text-caption tabular-nums text-ink-muted">
          {plural(locale, visible.length, messages.gallery.resultCount)}
        </p>
      </div>

      {visible.length > 0 ? (
        <ArtworkGrid items={visible} locale={locale} query={query} />
      ) : (
        <EmptyState
          message={messages.gallery.empty}
          actionLabel={messages.gallery.reset}
          onReset={isDefaultFilters(filters) ? undefined : () => update(DEFAULT_FILTERS)}
        />
      )}
    </div>
  );
}
```

```tsx
// src/components/gallery/GalleryFilters.tsx
'use client';

import type { GalleryFilters as F, ColorFilter, AvailabilityFilter, facetCounts } from '@/lib/gallery/filters';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useI18n } from '@/components/providers/I18nProvider';

interface Props {
  filters: F;
  counts: ReturnType<typeof facetCounts>;
  onChange: (patch: Partial<F>) => void;
}

export function GalleryFilters({ filters, counts, onChange }: Props) {
  const { messages } = useI18n();
  const g = messages.gallery;

  return (
    <fieldset className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
      <legend className="sr-only">{g.filtersLegend}</legend>

      <SegmentedControl<ColorFilter>
        name="ink"
        label={g.color.label}
        value={filters.color}
        onChange={(color) => onChange({ color })}
        options={[
          { value: 'all', label: g.color.all, count: counts.color.all },
          { value: 'black-and-white', label: g.color['black-and-white'], count: counts.color['black-and-white'] },
          { value: 'colorful', label: g.color.colorful, count: counts.color.colorful },
        ]}
      />

      <SegmentedControl<AvailabilityFilter>
        name="reprints"
        label={g.availability.label}
        value={filters.availability}
        onChange={(availability) => onChange({ availability })}
        options={[
          { value: 'all', label: g.availability.all, count: counts.availability.all },
          { value: 'reprints', label: g.availability.reprints, count: counts.availability.reprints },
        ]}
      />
    </fieldset>
  );
}
```

```tsx
// src/components/ui/SegmentedControl.tsx
'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';

interface Option<T extends string> { value: T; label: string; count?: number }

interface Props<T extends string> {
  name: string;
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}

/** Native radio inputs styled as segments → keyboard arrows & screen readers work for free. */
export function SegmentedControl<T extends string>({ name, label, value, options, onChange }: Props<T>) {
  const id = useId();
  return (
    <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex items-center gap-3">
      <span id={`${id}-label`} className="text-eyebrow uppercase text-ink-subtle">{label}</span>
      <div className="inline-flex border border-rule-strong">
        {options.map((o) => {
          const disabled = o.count === 0 && o.value !== value;
          return (
            <label
              key={o.value}
              className={cn(
                'relative cursor-pointer px-3 py-1.5 text-caption transition-colors',
                'border-r border-rule-strong last:border-r-0',
                'has-checked:bg-ink has-checked:text-canvas',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
                disabled ? 'cursor-not-allowed text-ink-subtle/60' : 'hover:bg-surface',
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={o.value === value}
                disabled={disabled}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.label}
              {o.count !== undefined && <span className="ml-1.5 tabular-nums opacity-60">{o.count}</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}
```

```tsx
// src/components/gallery/ArtworkGrid.tsx  (no 'use client' — usable from server fallback and client Gallery)
import type { GalleryItem } from '@/data/schema/artwork';
import type { Locale } from '@/lib/i18n/config';
import { ArtworkCard } from './ArtworkCard';

const EAGER_COUNT = 4; // first row on desktop

export function ArtworkGrid({ items, locale, query }: { items: GalleryItem[]; locale: Locale; query: string }) {
  return (
    <ul className="grid grid-cols-2 items-start gap-x-gutter gap-y-stack md:grid-cols-3 xl:grid-cols-4">
      {items.map((item, i) => (
        <li key={item.id}>
          <ArtworkCard item={item} locale={locale} query={query} eager={i < EAGER_COUNT} />
        </li>
      ))}
    </ul>
  );
}
```

```tsx
// src/components/gallery/ArtworkCard.tsx
import Image from 'next/image';
import Link from 'next/link';
import type { GalleryItem } from '@/data/schema/artwork';
import type { Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/cn';

export function ArtworkCard({ item, locale, query, eager }: { item: GalleryItem; locale: Locale; query: string; eager: boolean }) {
  const href = `/${locale}/works/${item.slug}${query ? `?${query}` : ''}`;
  const mono = item.styleCategory === 'black-and-white';

  return (
    <figure data-artwork-card={item.slug} className="group">
      <Link href={href} scroll={false} className="block focus-visible:outline-offset-4">
        <div className={cn('bg-mat', mono && 'ring-1 ring-rule')}>
          <Image
            src={item.image.src}
            alt={item.image.alt}
            width={item.image.width}
            height={item.image.height}
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            quality={75}
            placeholder={item.image.blurDataURL ? 'blur' : 'empty'}
            blurDataURL={item.image.blurDataURL}
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'auto'}
            className="h-auto w-full"
          />
        </div>
        <figcaption className="mt-3 flex items-baseline justify-between gap-3">
          <span className="font-serif text-body leading-snug decoration-1 underline-offset-4 group-hover:underline">
            {item.title}
          </span>
          {item.year !== null && <span className="shrink-0 text-caption tabular-nums text-ink-muted">{item.year}</span>}
        </figcaption>
      </Link>
    </figure>
  );
}
```

Grid rules:

- Intrinsic aspect ratio preserved via `width`/`height` + `h-auto w-full` → zero CLS, no cropping of artwork.
- Row-major reading order (CSS grid, not CSS columns) so chronological order is preserved for keyboard/screen-reader users.
- Monochrome works get a 1px `ring-rule` so white paper edges remain visible against the near-white canvas.

### 3.7 Lightbox / Modal architecture

**Routing**

| Navigation | Result |
|---|---|
| Soft nav from gallery card → `/[locale]/works/[slug]?ink=…` | `@modal/(.)works/[slug]` intercepts → `<LightboxDialog>` over the gallery |
| Hard load / shared link / refresh | `(portfolio)/works/[slug]/page.tsx` → full-page view |
| Close (✕, `Esc`, click on the mat around the artwork) | `router.back()` → gallery URL with filters intact |
| Prev / next (buttons, ← / →) | `router.replace()` within the modal — no history spam, back still closes |
| Any navigation elsewhere | `@modal/[...rest]` renders `null` → modal unmounts |

```tsx
// src/app/[locale]/@modal/default.tsx
export default function Default() { return null; }

// src/app/[locale]/@modal/[...rest]/page.tsx
export default function CatchAll() { return null; }
```

> The slot's catch-all **must** use the same param name as `children`'s `[locale]/[...rest]`.
> Next 16.4 fails the build with "Ambiguous route pattern `/[*]/[...*]`" when a slot and
> `children` declare catch-alls with different names (`[...catchAll]` vs `[...rest]`).

```tsx
// src/app/[locale]/@modal/(.)works/[slug]/page.tsx
import { resolveLocale } from '@/lib/i18n/route';
import { getAllArtworks, getArtworkBySlug, getNavIndex } from '@/lib/data/artworks';
import { locales } from '@/lib/i18n/config';
import { LightboxDialog } from '@/components/artwork/LightboxDialog';
import { ArtworkDetailView } from '@/components/artwork/ArtworkDetailView';

export function generateStaticParams() {
  return locales.flatMap((locale) => getAllArtworks().map((a) => ({ locale, slug: a.slug })));
}

export default async function ArtworkModal({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const artwork = getArtworkBySlug(slug);
  if (!artwork) return null;

  return (
    <LightboxDialog
      slug={artwork.slug}
      ink={artwork.styleCategory === 'black-and-white' ? 'mono' : 'color'}
      titleId="artwork-title"
      navIndex={getNavIndex()}
      fullPageHref={`/${locale}/works/${artwork.slug}`}
    >
      <ArtworkDetailView artwork={artwork} locale={locale} variant="modal" />
    </LightboxDialog>
  );
}
```

**Layout spec**

```text
Desktop ≥1024px (full-viewport <dialog>, bg = mat token)
┌──────────────────────────────────────────────────────────┬──────────────────────┐
│ [‹]                                                  [›] │ ✕   Mat: ◐ Light Dark │
│                                                          │                      │
│                                                          │ ART-0001             │
│                ARTWORK  (object-contain,                 │ Hraun við sjó        │  ← font-serif text-title
│                 max-h: 100dvh − 4rem)                    │ 1978                 │
│                                                          │ ──────────────────── │
│                                                          │ Efni   Tússpenni…    │  ← <dl>
│                                                          │ Stærð  42 × 29,7 cm  │
│                                                          │ ──────────────────── │
│                                                          │ ● Fáanlegt sem       │
│                                                          │   eftirprent         │
│                                                          │ [ Kaupa eftirprent ] │  ← swaps aside to form
└──────────────────────────────────────────────────────────┴──────────────────────┘
             flex-1                                              w-[26rem] border-l

Mobile <1024px: image (max-h 60dvh) stacked above a scrollable details panel;
prev/next become a bottom bar; ✕ fixed top-right with 44×44px hit area.
```

```tsx
// src/components/artwork/LightboxDialog.tsx
'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { NavIndexEntry } from '@/data/schema/artwork';
import { useI18n } from '@/components/providers/I18nProvider';
import { LightboxNav } from './LightboxNav';
import { cn } from '@/lib/cn';

type Mat = 'auto' | 'light' | 'dark';

interface Props {
  slug: string;
  ink: 'mono' | 'color';
  titleId: string;
  navIndex: NavIndexEntry[];
  fullPageHref: string;
  children: React.ReactNode;
}

/** Elements marked with this attribute count as backdrop: clicking them closes the lightbox. */
export const BACKDROP_ATTR = 'data-lightbox-backdrop';

export function LightboxDialog({ slug, ink, titleId, navIndex, fullPageHref, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { messages } = useI18n();
  const t = messages.lightbox;
  const [mat, setMat] = useState<Mat>('auto');

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      // Restore focus to the card of the work shown last. While another lightbox is open (prev/next
      // remounts this component) the grid is inert, so this is a no-op until the final close.
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(`[data-artwork-card="${slug}"] a`)
          ?.focus({ preventScroll: true });
      });
    };
  }, [slug]);

  const close = useCallback(() => router.back(), [router]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      data-ink={ink}
      data-mat={mat === 'auto' ? undefined : mat}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        // The dialog fills the viewport, so the native ::backdrop is never hit. The mat around the
        // artwork (marked with BACKDROP_ATTR) plays that role instead.
        const target = e.target as HTMLElement;
        if (target === e.currentTarget || target.hasAttribute(BACKDROP_ATTR)) close();
      }}
      className={cn(
        'fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden p-0',
        'bg-mat text-mat-ink backdrop:bg-scrim open:animate-fade-in',
      )}
    >
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 lg:right-[calc(26rem+0.75rem)]">
        <div
          role="group"
          aria-label={t.mat.label}
          className="hidden items-center gap-1 text-caption sm:flex"
        >
          {(['light', 'dark'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mat === m}
              onClick={() => setMat((cur) => (cur === m ? 'auto' : m))}
              className="px-2 py-1 text-mat-ink/70 aria-pressed:text-mat-ink aria-pressed:underline"
            >
              {t.mat[m]}
            </button>
          ))}
        </div>
        {/* Plain <a>: a soft <Link> to this URL would be intercepted again and stay in the modal. */}
        <a href={fullPageHref} className="sr-only focus:not-sr-only focus:px-2 focus:py-1">
          {t.openFullPage}
        </a>
        <button
          type="button"
          onClick={close}
          aria-label={t.close}
          className="grid size-11 place-items-center text-mat-ink"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </button>
      </div>

      {/* useSearchParams() in a prerendered route must sit under a Suspense boundary. */}
      <Suspense fallback={null}>
        <LightboxNav currentSlug={slug} index={navIndex} />
      </Suspense>
      {children}
    </dialog>
  );
}
```

```tsx
// src/components/artwork/LightboxNav.tsx
'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { NavIndexEntry } from '@/data/schema/artwork';
import { filterItems, parseFilters, serializeFilters } from '@/lib/gallery/filters';
import { useI18n } from '@/components/providers/I18nProvider';
import { cn } from '@/lib/cn';

export function LightboxNav({
  currentSlug,
  index,
}: {
  currentSlug: string;
  index: NavIndexEntry[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, messages } = useI18n();

  const { prevHref, nextHref } = useMemo(() => {
    const filters = parseFilters(searchParams);
    const filtered = filterItems(index, filters);
    // If the current work isn't in the filtered set (e.g. deep link), navigate the full set.
    const list = filtered.some((e) => e.slug === currentSlug) ? filtered : index;
    const i = list.findIndex((e) => e.slug === currentSlug);
    const n = list.length;
    const qs = serializeFilters(filters);
    const hrefFor = (slug: string) => `/${locale}/works/${slug}${qs ? `?${qs}` : ''}`;
    const prev = n > 1 ? list[(i - 1 + n) % n] : undefined;
    const next = n > 1 ? list[(i + 1) % n] : undefined;
    return {
      prevHref: prev && hrefFor(prev.slug),
      nextHref: next && hrefFor(next.slug),
    };
  }, [searchParams, index, currentSlug, locale]);

  useEffect(() => {
    if (prevHref) router.prefetch(prevHref);
    if (nextHref) router.prefetch(nextHref);
  }, [router, prevHref, nextHref]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      // Never hijack typing in a form field.
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'ArrowLeft' && prevHref) router.replace(prevHref, { scroll: false });
      if (e.key === 'ArrowRight' && nextHref) router.replace(nextHref, { scroll: false });
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, prevHref, nextHref]);

  if (!prevHref || !nextHref) return null;

  // <lg: fixed bottom bar; ≥lg: arrows centred on the image pane's edges.
  const btn =
    'z-10 grid size-12 place-items-center text-mat-ink/70 hover:text-mat-ink lg:absolute lg:top-1/2 lg:-translate-y-1/2';
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 flex justify-between border-t border-rule bg-mat lg:contents">
      <Link
        replace
        scroll={false}
        href={prevHref}
        aria-label={messages.lightbox.previous}
        className={cn(btn, 'lg:left-2')}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
        >
          <path d="M15 4l-8 8 8 8" />
        </svg>
      </Link>
      <Link
        replace
        scroll={false}
        href={nextHref}
        aria-label={messages.lightbox.next}
        className={cn(btn, 'lg:right-[calc(26rem+0.5rem)]')}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
        >
          <path d="M9 4l8 8-8 8" />
        </svg>
      </Link>
    </div>
  );
}
```

```tsx
// src/components/artwork/ArtworkDetailView.tsx  (Server Component; shared by modal + full page)
import Image from 'next/image';
import type { Artwork } from '@/data/schema/artwork';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { localize } from '@/lib/i18n/localize';
import { formatArtworkYear, formatDimensions } from '@/lib/i18n/format';
import { ReprintPanel } from './ReprintPanel';
import { cn } from '@/lib/cn';

/** Server Component shared by the lightbox (`modal`) and the full work page (`page`). */
export function ArtworkDetailView({
  artwork,
  locale,
  variant,
}: {
  artwork: Artwork;
  locale: Locale;
  variant: 'modal' | 'page';
}) {
  const t = getDictionary(locale).lightbox;
  const title = localize(artwork.title, locale);
  const modal = variant === 'modal';

  return (
    <div
      className={cn(
        'grid lg:grid-cols-[1fr_26rem]',
        modal
          ? 'h-dvh grid-rows-[auto_minmax(0,1fr)] lg:grid-rows-1'
          : 'min-h-[calc(100dvh-var(--header-h))]',
      )}
    >
      <div
        // In the lightbox, the mat around the artwork acts as the backdrop (click closes).
        data-lightbox-backdrop={modal ? '' : undefined}
        className="flex min-h-0 items-center justify-center bg-mat p-gutter lg:p-12"
      >
        <Image
          src={artwork.image.src}
          alt={localize(artwork.image.alt, locale)}
          width={artwork.image.width}
          height={artwork.image.height}
          sizes="(min-width: 1024px) calc(100vw - 26rem), 100vw"
          quality={90}
          placeholder={artwork.image.blurDataURL ? 'blur' : 'empty'}
          blurDataURL={artwork.image.blurDataURL}
          loading="eager"
          fetchPriority="high"
          className="h-auto max-h-[60dvh] w-auto max-w-full object-contain lg:max-h-[calc(100dvh-6rem)]"
        />
      </div>

      <aside
        className={cn(
          'overflow-y-auto border-t border-rule bg-surface p-gutter text-ink lg:border-t-0 lg:border-l lg:p-10',
          modal && 'pb-20 lg:pb-10', // clears the mobile prev/next bar
        )}
      >
        <p className="text-eyebrow text-ink-subtle uppercase">{artwork.id}</p>
        <h1 id="artwork-title" className="mt-2 font-serif text-title">
          {title}
        </h1>
        <p className="mt-1 text-caption text-ink-muted tabular-nums">
          {formatArtworkYear(artwork.year, artwork.yearCirca, t)}
        </p>

        <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 border-y border-rule py-6 text-caption">
          <dt className="text-ink-subtle">{t.medium}</dt>
          <dd>{localize(artwork.medium, locale)}</dd>
          <dt className="text-ink-subtle">{t.dimensions}</dt>
          <dd className="tabular-nums">
            {formatDimensions(artwork.dimensions.widthCm, artwork.dimensions.heightCm, locale)}
          </dd>
          <dt className="text-ink-subtle">{t.catalogueId}</dt>
          <dd className="tabular-nums">{artwork.id}</dd>
        </dl>

        {artwork.description && (
          <p className="mt-6 text-body text-ink-muted">{localize(artwork.description, locale)}</p>
        )}

        {artwork['available-as-reprint'] && (
          <ReprintPanel artworkId={artwork.id} artworkTitle={title} />
        )}
      </aside>
    </div>
  );
}
```

`ArtworkDetailView` renders it as `<ReprintPanel artworkId={artwork.id} artworkTitle={title} pageHref={`/${locale}/works/${artwork.slug}`} />`.

```tsx
// src/components/artwork/ReprintPanel.tsx
'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { sendInquiry } from '@/app/actions/sendInquiry';
import {
  INITIAL_INQUIRY_STATE,
  STARTED_AT_UNSTAMPED,
  type InquiryState,
} from '@/data/schema/inquiry';
import { useI18n } from '@/components/providers/I18nProvider';
import { ReprintInquiryForm } from '@/components/inquiry/ReprintInquiryForm';
import { cn } from '@/lib/cn';

const SECTION_ID = 'reprint-inquiry';

export function ReprintPanel({
  artworkId,
  artworkTitle,
  pageHref,
}: {
  artworkId: string;
  artworkTitle: string;
  pageHref: string;
}) {
  const { messages } = useI18n();
  const [state, formAction] = useActionState(sendInquiry, INITIAL_INQUIRY_STATE);
  const [view, setView] = useState<'cta' | 'form'>('cta');
  // Deterministic until the CTA click stamps it, so SSR and hydration agree.
  const [startedAt, setStartedAt] = useState(STARTED_AT_UNSTAMPED);
  // `useActionState` can't be reset: "Back" marks the current result as dismissed instead.
  const [dismissed, setDismissed] = useState<InquiryState | null>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returning = useRef(false);

  const current = state === dismissed ? INITIAL_INQUIRY_STATE : state;
  const showForm = view === 'form' || current.status !== 'idle';

  // Focus the form heading on open; refocus the CTA only when coming back — never on first mount.
  useEffect(() => {
    if (view === 'form') {
      returning.current = true;
      headingRef.current?.focus({ preventScroll: true });
    } else if (returning.current) {
      returning.current = false;
      ctaRef.current?.focus({ preventScroll: true });
    }
  }, [view]);

  function open(e: React.MouseEvent) {
    e.preventDefault();
    setStartedAt(Date.now());
    setView('form');
  }

  function back() {
    // A hash from a pre-hydration click would keep the form visible via `:target`.
    if (window.location.hash === `#${SECTION_ID}`) {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }
    setDismissed(state);
    setView('cta');
  }

  return (
    <div className="mt-8">
      <section id={SECTION_ID} className={cn('peer', showForm ? 'animate-fade-in' : 'hidden target:block')}>
        <ReprintInquiryForm
          artworkId={artworkId}
          artworkTitle={artworkTitle}
          state={current}
          formAction={formAction}
          startedAt={startedAt}
          headingRef={headingRef}
          onBack={back}
          backHref={pageHref}
        />
      </section>

      {!showForm && (
        <div className="peer-target:hidden">
          <p className="flex items-center gap-2 text-caption">
            <span aria-hidden className="size-1.5 rounded-full bg-ink" />
            {messages.lightbox.reprintAvailable}
          </p>
          <a
            ref={ctaRef}
            href={`#${SECTION_ID}`}
            aria-expanded={false}
            aria-controls={SECTION_ID}
            onClick={open}
            className="mt-4 block w-full bg-ink px-6 py-3.5 text-center text-caption tracking-[0.14em] text-canvas uppercase transition-opacity hover:opacity-90"
          >
            {messages.lightbox.buyReprint}
          </a>
        </div>
      )}
    </div>
  );
}
```

**Full-page route** `(portfolio)/works/[slug]/page.tsx`: same `generateStaticParams` as the modal, `generateMetadata` (title, description from `medium` + year, `openGraph.images` from the artwork via `/_next/image` URL is not allowed — use the Bunny Optimizer URL from `lib/images/cdn.ts` at 1200 px), `alternatesFor(locale, '/works/' + slug)`, JSON-LD `VisualArtwork` (Appendix A), renders `<ArtworkDetailView variant="page" />` plus a "← Works" back link to `/${locale}`. Unknown slug → `notFound()`. The page wraps everything in `<article data-ink>` so `bg-mat` follows the ink profile, and the `VisualArtwork` `creator.name` comes from `getSite().artist.name`. The year label (in the detail view and in the meta description) comes from `formatArtworkYear()` in `lib/i18n/format.ts`.

**Implementation notes** (things the code above does on purpose; don't "simplify" them away)

- **Backdrop = the mat.** The `<dialog>` fills the viewport and the detail view covers it, so the native `::backdrop` can never be clicked. The image pane carries `data-lightbox-backdrop` in the modal variant, and a click on it, or on the dialog itself, closes the lightbox. Clicks on the image or the aside do not.
- **`LightboxNav` sits in `<Suspense fallback={null}>`.** It calls `useSearchParams()` inside a prerendered (`generateStaticParams`) route, and without a boundary `next build` fails.
- **"Open as page" is a plain `<a>`.** A soft `<Link>` to the same URL would be intercepted again and stay in the modal.
- **`ReprintPanel` refocuses the CTA only after "Back" from the form**, never on mount. Focusing on mount would steal focus on full-page loads.
- **Mobile:** the modal grid uses `grid-rows-[auto_minmax(0,1fr)]` so the aside scrolls inside `h-dvh`. Below `lg`, prev/next form a fixed bottom bar (the wrapper is `lg:contents`, so at `lg` and up the links are absolutely positioned against the dialog), and the aside gets `pb-20` to clear the bar.
- **Focus return after prev/next:** the dialog remounts per slug, so closing returns focus to the card of the work *shown last*. That card is where the user's attention is, and it is always in the filtered grid.
- **`ReprintPanel` works without JavaScript** (Phase 6). The form is always server-rendered and stays `hidden` until opened. The CTA is a `#reprint-inquiry` link, so with JS off, `:target` reveals the form (and `peer-target:hidden` hides the CTA). With JS on, `onClick` prevents the jump and switches `view`. `useActionState` lives in the panel, not the form, so the response to a no-JS POST renders the form view with the returned errors or success. If the form owned the hook, the server would re-render the panel in `cta` view and the result would be lost. "Back" is a link to `pageHref`; without JS, that GET gives a fresh form.

**Lightbox acceptance criteria** (covered by `e2e/lightbox.spec.ts`)

- `Esc`, ✕, and a click on the mat all close via `router.back()`; focus returns to the originating card (after prev/next: the card of the work shown last).
- `html:has(dialog[open])` locks page scroll (CSS in §6).
- ←/→ do nothing while focus is in the inquiry form.
- Prev/next respect the active filter combination.
- Lightbox image never upscales beyond its intrinsic size and never crops.
- A hard load or refresh of a work URL renders the full page, never the modal.

---

## 4. Next.js Server Actions & Resend Integration

### 4.1 Architecture

```text
ReprintPanel (client)                useActionState(sendInquiry, INITIAL_INQUIRY_STATE)
  └─ ReprintInquiryForm (client)     receives state + formAction as props
     └─ <form action={formAction}>
        │  FormData: name, email, message                       (visible)
        │            artworkId, artworkTitle, locale, startedAt (hidden context)
        │            company                                    (honeypot, must be empty)
        ▼
src/app/actions/sendInquiry.ts  ('use server')
  1. Honeypot  → silent fake success
  2. Zod safeParse(inquirySchema) → field error CODES (not prose)
  3. Min-fill-time check (anti-bot speed bump; skipped when startedAt = 0, i.e. no JS)
  4. Server-side truth: artwork exists AND ['available-as-reprint'] === true
  5. Resend send → React Email template (canonical bilingual title from server data)
  6. Return InquiryState (idle | success | error)
        ▼
Client maps error codes → messages.inquiry.errors[code] in the ACTIVE locale
```

Error **codes** (not localized strings) cross the wire. This keeps the action locale-agnostic, guarantees the UI language always matches the page locale, and — via `Record<InquiryErrorCode, string>` in `Dictionary` — makes a missing translation a compile error.

### 4.2 Shared schema & state types

```ts
// src/data/schema/inquiry.ts   (NO server-only — imported by the client form)
import { z } from 'zod';
import { locales } from '@/lib/i18n/config';

export const INQUIRY_LIMITS = {
  name: { min: 2, max: 120 },
  email: { max: 254 },
  message: { min: 10, max: 4000 },
  title: { max: 200 },
} as const;

export const MIN_FILL_TIME_MS = 3_000;
/** `startedAt` rendered before JavaScript stamps the form; skips the min-fill-time check. */
export const STARTED_AT_UNSTAMPED = 0;

export const INQUIRY_ERROR_CODES = [
  'name_required', 'name_too_short', 'name_too_long',
  'email_required', 'email_too_long', 'email_invalid',
  'message_required', 'message_too_short', 'message_too_long',
  'artwork_invalid', 'artwork_unavailable',
  'submission_too_fast', 'send_failed', 'unknown',
] as const;
export type InquiryErrorCode = (typeof INQUIRY_ERROR_CODES)[number];

export function isInquiryErrorCode(v: unknown): v is InquiryErrorCode {
  return typeof v === 'string' && (INQUIRY_ERROR_CODES as readonly string[]).includes(v);
}

const e = (code: InquiryErrorCode) => ({ error: code });

export const inquirySchema = z.object({
  // Visible fields
  name: z.string().trim()
    .min(1, e('name_required'))
    .min(INQUIRY_LIMITS.name.min, e('name_too_short'))
    .max(INQUIRY_LIMITS.name.max, e('name_too_long')),
  email: z.string().trim().toLowerCase()
    .min(1, e('email_required'))
    .max(INQUIRY_LIMITS.email.max, e('email_too_long'))
    .pipe(z.email(e('email_invalid'))),
  message: z.string().trim()
    .min(1, e('message_required'))
    .min(INQUIRY_LIMITS.message.min, e('message_too_short'))
    .max(INQUIRY_LIMITS.message.max, e('message_too_long')),
  // Hidden context fields
  artworkId: z.string().regex(/^ART-\d{4}$/, e('artwork_invalid')),
  artworkTitle: z.string().trim().min(1, e('artwork_invalid')).max(INQUIRY_LIMITS.title.max, e('artwork_invalid')),
  locale: z.enum(locales),
  /**
   * Epoch ms when the form was opened. Client-supplied, so only a speed bump.
   * `STARTED_AT_UNSTAMPED` (0): submitted without JavaScript from a static page.
   */
  startedAt: z.coerce.number().int().nonnegative(),
});
export type InquiryInput = z.infer<typeof inquirySchema>;

export const INQUIRY_VISIBLE_FIELDS = ['name', 'email', 'message'] as const;
export type InquiryField = (typeof INQUIRY_VISIBLE_FIELDS)[number];
export type InquiryValues = Record<InquiryField, string>;

export type InquiryState =
  | { status: 'idle' }
  | { status: 'success'; at: number }
  | {
      status: 'error';
      fieldErrors: Partial<Record<InquiryField, InquiryErrorCode>>;
      formError?: InquiryErrorCode;
      /** Echo of visible inputs so React 19's automatic form reset doesn't wipe user text. */
      values: InquiryValues;
      at: number;
    };

export const INITIAL_INQUIRY_STATE: InquiryState = { status: 'idle' };
```

### 4.3 Environment & Resend client

```ts
// src/lib/env.ts
import 'server-only';
import { z } from 'zod';

const serverEnvSchema = z.object({
  RESEND_API_KEY: z.string().startsWith('re_'),
  RESEND_FROM_EMAIL: z.string().min(3),   // "Name <addr@verified-domain>"
  INQUIRY_TO_EMAIL: z.email(),
  NEXT_PUBLIC_SITE_URL: z.url(),
});

let cached: z.infer<typeof serverEnvSchema> | undefined;

/** Lazy: parsed on first use (request time), so builds without secrets still succeed. */
export function getServerEnv() {
  cached ??= serverEnvSchema.parse(process.env);
  return cached;
}
```

```ts
// src/lib/email/resend.ts
import 'server-only';
import { Resend } from 'resend';
import { getServerEnv } from '@/lib/env';

let client: Resend | undefined;

export function getResend(): Resend {
  client ??= new Resend(getServerEnv().RESEND_API_KEY);
  return client;
}
```

```ts
// src/lib/images/cdn.ts
/**
 * Bunny Optimizer URL (used where next/image can't run: emails, OG tags, blur script).
 * Requires Bunny Optimizer enabled on the Pull Zone. With automatic WebP/AVIF disabled,
 * the response keeps the master's format (JPEG) — exactly what mail clients need.
 */
export function bunnyTransform(src: string, opts: { width: number; quality?: number }): string {
  const url = new URL(src);
  if (!url.hostname.endsWith('.b-cdn.net') && !url.hostname.startsWith('cdn.')) return src;
  url.searchParams.set('width', String(opts.width));
  url.searchParams.set('quality', String(opts.quality ?? 80));
  return url.toString();
}
```

> Emails must use **JPEG** thumbnails; AVIF/WebP support across mail clients is unreliable. Masters are uploaded as JPEG and Bunny's automatic format conversion is off, so `bunnyTransform` URLs always return JPEG.

### 4.4 Server Action — `src/app/actions/sendInquiry.ts`

```ts
'use server';

import { createElement } from 'react';
import { z } from 'zod';
import { getResend } from '@/lib/email/resend';
import { getServerEnv } from '@/lib/env';
import { getArtworkById } from '@/lib/data/artworks';
import { bunnyTransform } from '@/lib/images/cdn';
import { ReprintInquiryEmail } from '@/components/emails/ReprintInquiryEmail';
import {
  inquirySchema, isInquiryErrorCode, MIN_FILL_TIME_MS, INQUIRY_VISIBLE_FIELDS, STARTED_AT_UNSTAMPED,
  type InquiryState, type InquiryValues, type InquiryField, type InquiryErrorCode,
} from '@/data/schema/inquiry';

const CONTEXT_FIELDS = ['artworkId', 'artworkTitle', 'locale', 'startedAt'] as const;

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

function errorState(
  values: InquiryValues,
  extra: { fieldErrors?: Partial<Record<InquiryField, InquiryErrorCode>>; formError?: InquiryErrorCode },
): InquiryState {
  return { status: 'error', fieldErrors: extra.fieldErrors ?? {}, formError: extra.formError, values, at: Date.now() };
}

export async function sendInquiry(_prev: InquiryState, formData: FormData): Promise<InquiryState> {
  const values: InquiryValues = { name: str(formData, 'name'), email: str(formData, 'email'), message: str(formData, 'message') };

  // 1. Honeypot — bots get a fake success and nothing is sent.
  if (str(formData, 'company') !== '') return { status: 'success', at: Date.now() };

  // 2. Validation
  const parsed = inquirySchema.safeParse({
    ...values,
    artworkId: str(formData, 'artworkId'),
    artworkTitle: str(formData, 'artworkTitle'),
    locale: str(formData, 'locale'),
    startedAt: str(formData, 'startedAt'),
  });

  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    const mapped: Partial<Record<InquiryField, InquiryErrorCode>> = {};
    for (const f of INQUIRY_VISIBLE_FIELDS) {
      const code = fieldErrors[f]?.[0];
      if (code) mapped[f] = isInquiryErrorCode(code) ? code : 'unknown';
    }
    const contextBroken = CONTEXT_FIELDS.some((k) => fieldErrors[k]?.length);
    return errorState(values, { fieldErrors: mapped, formError: contextBroken ? 'artwork_invalid' : undefined });
  }

  const data = parsed.data;

  // 3. Speed bump against naive bots (client-supplied → not a security boundary).
  //    Unstamped = submitted without JavaScript from a static page; there is no start time.
  if (data.startedAt !== STARTED_AT_UNSTAMPED && Date.now() - data.startedAt < MIN_FILL_TIME_MS) {
    return errorState(values, { formError: 'submission_too_fast' });
  }

  // 4. Server-side truth — never trust hidden fields.
  const artwork = getArtworkById(data.artworkId);
  if (!artwork) return errorState(values, { formError: 'artwork_invalid' });
  if (!artwork['available-as-reprint']) return errorState(values, { formError: 'artwork_unavailable' });

  // 5. Send. Env parsing is inside the try: a misconfigured deployment shows `send_failed`
  //    in the form instead of throwing into the error boundary.
  try {
    const env = getServerEnv();
    const artworkUrl = `${env.NEXT_PUBLIC_SITE_URL}/${data.locale}/works/${artwork.slug}`;

    const { error } = await getResend().emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: [env.INQUIRY_TO_EMAIL],
      replyTo: data.email,
      subject: `Fyrirspurn um eftirprent · Reprint inquiry — ${artwork.title.is} (${artwork.id})`,
      react: createElement(ReprintInquiryEmail, {
        name: data.name,
        email: data.email,
        message: data.message,
        artworkId: artwork.id,
        artworkTitleIs: artwork.title.is,
        artworkTitleEn: artwork.title.en,
        artworkYear: artwork.year,
        artworkImageUrl: bunnyTransform(artwork.image.src, { width: 1072 }),
        artworkUrl,
        submittedLocale: data.locale,
        submittedAt: new Date().toISOString(),
      }),
      tags: [{ name: 'type', value: 'reprint-inquiry' }],
    });

    if (error) {
      console.error('[sendInquiry] Resend error', { name: error.name, message: error.message, artworkId: artwork.id });
      return errorState(values, { formError: 'send_failed' });
    }
  } catch (err) {
    // Not the raw error object: SDK errors can carry the request payload (user PII).
    console.error('[sendInquiry] Unexpected failure', {
      name: err instanceof Error ? err.name : typeof err,
      message: err instanceof Error ? err.message : undefined,
      artworkId: artwork.id,
    });
    return errorState(values, { formError: 'send_failed' });
  }

  return { status: 'success', at: Date.now() };
}
```

> **Resend + React rendering:** `resend` 6.x renders the `react:` option through `@react-email/render`, which it declares as an *optional* peer. Under pnpm's strict layout the copy nested inside `react-email` may not be visible to `resend`. If sending fails with a missing-module error in Phase 6, render explicitly with `render()` from `react-email` and pass `html` (and `text`) instead of `react` — no new dependency needed.

**Security checklist**

| Threat | Mitigation |
|---|---|
| CSRF | Built-in Server Action Origin/Host check (no extra config; do **not** widen `serverActions.allowedOrigins`) |
| Spoofed artwork / title | Server re-reads artwork by ID; email uses server data; reprint flag enforced server-side |
| Header injection | Resend SDK + Zod `z.email()`; user email only in `replyTo` |
| HTML injection in email | React Email escapes all interpolated text |
| Bots | Honeypot + min fill time; add a **Vercel Firewall rate-limit rule** (e.g. 5 POST / 10 min / IP on requests carrying the `Next-Action` header) |
| Email bombing third parties | **No** auto-reply to the submitter's address |
| Secret leakage | `server-only` on env/resend modules; key never in `NEXT_PUBLIC_*` |
| Log PII | Log artwork ID and error metadata only — never name, email or message |

### 4.5 Email template — `src/components/emails/ReprintInquiryEmail.tsx`

```tsx
import { Fragment } from 'react';
import {
  Body, Column, Container, Head, Heading, Hr, Html, Img, Link, Preview, Row, Section, Text,
} from 'react-email';
import type { Locale } from '@/lib/i18n/config';

export interface ReprintInquiryEmailProps {
  name: string;
  email: string;
  message: string;
  artworkId: string;
  artworkTitleIs: string;
  artworkTitleEn: string;
  artworkYear: number | null;
  artworkImageUrl: string;
  artworkUrl: string;
  submittedLocale: Locale;
  submittedAt: string; // ISO 8601
}

// Hex equivalents of the site tokens (mail clients do not support oklch / CSS variables).
const c = { canvas: '#f7f7f7', surface: '#ffffff', ink: '#141414', muted: '#5e5e5e', subtle: '#8a8a8a', rule: '#e4e4e4' };
const serif = "'EB Garamond', Georgia, 'Times New Roman', serif";
const sans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const s = {
  body: { backgroundColor: c.canvas, margin: 0, padding: '32px 0', fontFamily: sans, color: c.ink },
  container: { backgroundColor: c.surface, maxWidth: '600px', margin: '0 auto', padding: '40px 32px', border: `1px solid ${c.rule}` },
  eyebrow: { fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: c.subtle, margin: '0 0 12px' },
  h1: { fontFamily: serif, fontSize: '30px', lineHeight: '1.15', fontWeight: 400, margin: '0' },
  subtitle: { fontSize: '14px', color: c.muted, margin: '6px 0 24px' },
  image: { display: 'block', width: '100%', height: 'auto', border: `1px solid ${c.rule}` },
  hr: { borderColor: c.rule, margin: '28px 0' },
  label: { fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: c.subtle, margin: '0', width: '140px', verticalAlign: 'top' as const, paddingBottom: '10px' },
  value: { fontSize: '15px', color: c.ink, margin: '0', paddingBottom: '10px' },
  message: { fontSize: '15px', lineHeight: '1.65', color: c.ink, margin: '8px 0 0' },
  footer: { fontSize: '12px', lineHeight: '1.6', color: c.muted, margin: '0' },
  link: { color: c.ink, textDecoration: 'underline' },
};

export function ReprintInquiryEmail(p: ReprintInquiryEmailProps) {
  const submitted = new Intl.DateTimeFormat('is-IS', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Atlantic/Reykjavik',
  }).format(new Date(p.submittedAt));
  const lines = p.message.split(/\r?\n/);

  const rows: Array<[string, React.ReactNode]> = [
    ['Nafn · Name', p.name],
    ['Netfang · Email', <Link key="e" href={`mailto:${p.email}`} style={s.link}>{p.email}</Link>],
    ['Tungumál · Language', p.submittedLocale === 'is' ? 'Íslenska' : 'English'],
    ['Sent · Submitted', submitted],
  ];

  return (
    <Html lang="is">
      <Head />
      <Preview>{`Eftirprent: ${p.artworkTitleIs} — ${p.name}`}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Text style={s.eyebrow}>Fyrirspurn um eftirprent · Reprint inquiry</Text>
          <Heading as="h1" style={s.h1}>{p.artworkTitleIs}</Heading>
          <Text style={s.subtitle}>
            {p.artworkTitleEn}{p.artworkYear ? ` · ${p.artworkYear}` : ''} · {p.artworkId}
          </Text>

          <Section>
            <Link href={p.artworkUrl}>
              <Img src={p.artworkImageUrl} alt={p.artworkTitleIs} width="536" style={s.image} />
            </Link>
          </Section>

          <Hr style={s.hr} />

          <Section>
            {rows.map(([label, value]) => (
              <Row key={label}>
                <Column style={s.label}>{label}</Column>
                <Column style={s.value}>{value}</Column>
              </Row>
            ))}
          </Section>

          <Hr style={s.hr} />

          <Text style={s.eyebrow}>Skilaboð · Message</Text>
          <Text style={s.message}>
            {lines.map((line, i) => (
              <Fragment key={i}>{line}{i < lines.length - 1 && <br />}</Fragment>
            ))}
          </Text>

          <Hr style={s.hr} />

          <Text style={s.footer}>
            Svaraðu þessum pósti til að svara {p.name} beint. · Reply to this email to respond to {p.name} directly.
            <br />
            <Link href={p.artworkUrl} style={s.link}>Skoða verkið á vefnum · View the work online</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

ReprintInquiryEmail.PreviewProps = {
  name: 'Guðrún Jónsdóttir',
  email: 'gudrun@example.is',
  message: 'Góðan daginn,\nÉg hef áhuga á eftirprenti í stærð A3.\nKveðja, Guðrún',
  artworkId: 'ART-0001',
  artworkTitleIs: 'Hraun við sjó',
  artworkTitleEn: 'Lava by the Sea',
  artworkYear: 1978,
  artworkImageUrl: 'https://placehold.co/1072x758/jpg',
  artworkUrl: 'https://brynja-arnadottir.vercel.app/is/works/hraun-vid-sjo',
  submittedLocale: 'is',
  submittedAt: '2026-11-08T12:00:00.000Z',
} satisfies ReprintInquiryEmailProps;

export default ReprintInquiryEmail;
```

Preview locally with `pnpm email` (React Email dev server on :3001).

### 4.6 Client form — `src/components/inquiry/ReprintInquiryForm.tsx`

```tsx
'use client';

import { useEffect, useRef } from 'react';
import {
  INQUIRY_LIMITS, INQUIRY_VISIBLE_FIELDS, type InquiryField, type InquiryState,
} from '@/data/schema/inquiry';
import { useI18n } from '@/components/providers/I18nProvider';
import { FormField } from './FormField';
import { SubmitButton } from './SubmitButton';

interface Props {
  artworkId: string;
  artworkTitle: string;
  /** From `useActionState` in `ReprintPanel`, which owns it so no-JS POST responses render it (§3.7). */
  state: InquiryState;
  formAction: (payload: FormData) => void;
  /** Epoch ms when the form was opened, or `STARTED_AT_UNSTAMPED` before JavaScript runs. */
  startedAt: number;
  headingRef?: React.Ref<HTMLHeadingElement>;
  onBack: () => void;
  /** Without JavaScript, "Back" is a plain GET of the work page (fresh form state). */
  backHref: string;
}

export function ReprintInquiryForm({
  artworkId, artworkTitle, state, formAction, startedAt, headingRef, onBack, backHref,
}: Props) {
  const { locale, messages } = useI18n();
  const t = messages.inquiry;
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  // Focus management after each server response.
  useEffect(() => {
    if (state.status === 'success') { successRef.current?.focus(); return; }
    if (state.status !== 'error') return;
    const first = INQUIRY_VISIBLE_FIELDS.find((f) => state.fieldErrors[f]);
    const el = first ? formRef.current?.elements.namedItem(first) : null;
    if (el instanceof HTMLElement) el.focus();
    else alertRef.current?.focus();
  }, [state]);

  const back = (
    <a
      href={backHref}
      onClick={(e) => { e.preventDefault(); onBack(); }}
      className="text-caption underline decoration-1 underline-offset-4 hover:decoration-2"
    >
      {t.back}
    </a>
  );

  if (state.status === 'success') {
    return (
      <div role="status" className="border border-rule p-6">
        <h2 ref={successRef} tabIndex={-1} className="font-serif text-title outline-none">{t.successTitle}</h2>
        <p className="mt-3 text-body text-ink-muted">{t.successBody}</p>
        <p className="mt-6">{back}</p>
      </div>
    );
  }

  const err = (f: InquiryField) => (state.status === 'error' ? state.fieldErrors[f] : undefined);
  const val = (f: InquiryField) => (state.status === 'error' ? state.values[f] : '');
  const msg = (code: ReturnType<typeof err>) => (code ? t.errors[code] : undefined);

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-5">
      <header>
        <h2 ref={headingRef} tabIndex={-1} className="font-serif text-title outline-none">{t.heading}</h2>
        <p className="mt-2 text-caption text-ink-muted">
          {t.regarding}: <span className="text-ink">{artworkTitle}</span> · <span className="tabular-nums">{artworkId}</span>
        </p>
        <p className="mt-3 text-body text-ink-muted">{t.intro}</p>
      </header>

      {/* Hidden context */}
      <input type="hidden" name="artworkId" value={artworkId} />
      <input type="hidden" name="artworkTitle" value={artworkTitle} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="startedAt" value={startedAt} />

      {/* Honeypot — visually and programmatically hidden from humans */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label>Company<input type="text" name="company" tabIndex={-1} autoComplete="off" defaultValue="" /></label>
      </div>

      {state.status === 'error' && state.formError && (
        <p ref={alertRef} tabIndex={-1} role="alert" className="border-l-2 border-danger pl-3 text-caption text-danger outline-none">
          {t.errors[state.formError]}
        </p>
      )}

      <FormField
        // `key` forces remount with fresh defaultValue after each response (React 19 resets forms post-action).
        key={`name-${state.status === 'error' ? state.at : 0}`}
        name="name" label={t.name} autoComplete="name"
        defaultValue={val('name')} error={msg(err('name'))}
        maxLength={INQUIRY_LIMITS.name.max}
      />
      <FormField
        key={`email-${state.status === 'error' ? state.at : 0}`}
        name="email" type="email" label={t.email} autoComplete="email" inputMode="email"
        defaultValue={val('email')} error={msg(err('email'))}
        maxLength={INQUIRY_LIMITS.email.max}
      />
      <FormField
        key={`message-${state.status === 'error' ? state.at : 0}`}
        name="message" label={t.message} multiline rows={5} placeholder={t.messagePlaceholder}
        defaultValue={val('message')} error={msg(err('message'))}
        maxLength={INQUIRY_LIMITS.message.max}
      />

      <p className="text-caption text-ink-subtle">{t.privacyNote}</p>

      <div className="flex items-center justify-between gap-4">
        {back}
        <SubmitButton label={t.submit} pendingLabel={t.submitting} />
      </div>
    </form>
  );
}
```

```tsx
// src/components/inquiry/SubmitButton.tsx
'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="min-w-40 bg-ink px-6 py-3 text-caption uppercase tracking-[0.14em] text-canvas transition-opacity hover:opacity-90 disabled:cursor-progress disabled:opacity-60"
    >
      <span aria-live="polite">{pending ? pendingLabel : label}</span>
    </button>
  );
}
```

```tsx
// src/components/inquiry/FormField.tsx
import { useId } from 'react';
import { cn } from '@/lib/cn';

type Base = { name: string; label: string; error?: string; defaultValue?: string; maxLength?: number; placeholder?: string };
type InputProps = Base & { multiline?: false; type?: 'text' | 'email'; autoComplete?: string; inputMode?: 'email' | 'text' };
type AreaProps = Base & { multiline: true; rows?: number };

export function FormField(props: InputProps | AreaProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const shared = {
    id,
    name: props.name,
    defaultValue: props.defaultValue,
    maxLength: props.maxLength,
    placeholder: props.placeholder,
    'aria-invalid': props.error ? true : undefined,
    'aria-describedby': props.error ? errorId : undefined,
    className: cn(
      'w-full border border-rule-strong bg-surface px-3 py-2.5 text-body text-ink placeholder:text-ink-subtle',
      'focus:border-ink focus:outline-none aria-invalid:border-danger',
    ),
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-caption text-ink-muted">{props.label}</label>
      {props.multiline
        ? <textarea {...shared} rows={props.rows ?? 5} className={cn(shared.className, 'resize-y')} />
        : <input {...shared} type={props.type ?? 'text'} autoComplete={props.autoComplete} inputMode={props.inputMode} />}
      {props.error && <p id={errorId} className="text-caption text-danger">{props.error}</p>}
    </div>
  );
}
```

**Form state contract**

| State | UI |
|---|---|
| `idle` | Empty form |
| pending (`useFormStatus().pending`) | Submit disabled, label → `submitting`, `aria-live` announces |
| `error` + `fieldErrors` | Inline messages under fields (active-locale dictionary), first invalid field focused, values preserved |
| `error` + `formError` | `role="alert"` banner above fields, focused |
| `success` | Form replaced by `role="status"` panel, heading focused; "Back" returns to CTA |

Progressive enhancement: the form works without JavaScript (Server Action POST); validation is server-authoritative. `noValidate` disables inconsistent native bubbles in favour of localized messages. The mechanics live in `ReprintPanel` (§3.7): the form is server-rendered and revealed by `:target`, the panel owns `useActionState`, and "Back" is a real link. `startedAt` renders as `STARTED_AT_UNSTAMPED` (0) until the CTA click stamps it, so the server and hydration markup agree on these static pages; a no-JS submission therefore skips the min-fill-time check. Covered by `e2e/inquiry.spec.ts` with `javaScriptEnabled: false`.

---

## 5. Legacy Sections Content Model (Static JSON Architecture)

### 5.1 About layout & navigation

| Route | Page | Data |
|---|---|---|
| `/[locale]/about` | Biography | `about/biography.json` |
| `/[locale]/about/exhibitions` | Exhibition Timeline | `about/exhibitions.json` |
| `/[locale]/about/albums` | Album index | `about/albums.json` |
| `/[locale]/about/albums/[albumId]` | Album photo grid | `about/albums.json` |
| `/[locale]/about/press` | Press & Media Archive | `about/press.json` |
| *(global footer)* | Facebook link | `site.json` |

```tsx
// src/app/[locale]/(legacy)/about/layout.tsx
import { resolveLocale, localizedPath, type LocaleParams } from '@/lib/i18n/route';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { AboutNav } from '@/components/about/AboutNav';

export default async function AboutLayout({ children, params }: { children: React.ReactNode; params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const d = getDictionary(locale);
  const base = localizedPath(locale, '/about');

  return (
    <div className="mx-auto max-w-wide px-gutter pb-section">
      <header className="border-b border-rule pb-6 pt-stack">
        <p className="text-eyebrow uppercase text-ink-subtle">{d.about.heading}</p>
        <AboutNav
          label={d.nav.aboutSections}
          items={[
            { href: base, label: d.nav.biography, match: 'exact' },
            { href: `${base}/exhibitions`, label: d.nav.exhibitions, match: 'prefix' },
            { href: `${base}/albums`, label: d.nav.albums, match: 'prefix' },
            { href: `${base}/press`, label: d.nav.press, match: 'prefix' },
          ]}
        />
      </header>
      <div className="pt-stack">{children}</div>
    </div>
  );
}
```

`AboutNav` (client): horizontal, scrollable on mobile (`overflow-x-auto snap-x`), `aria-current="page"` via `usePathname()`, active item underlined with a 1px ink rule. Items are the header's `NavItem` (`match: 'exact' | 'prefix'`) and use the same `isCurrent()` from `NavLinks.tsx`, so `/about/albums/[albumId]` keeps "Albums" current.

### 5.2 Schemas (`src/data/schema/about.ts`)

```ts
import { z } from 'zod';
import { cdnImage, localizedString, localizedStringList, partialDate, uniqueKeys } from './shared';

/* ---------- Biography ---------- */
export const biographySchema = z.strictObject({
  portrait: cdnImage.extend({ credit: z.string().optional(), year: z.int().optional() }),
  born: z.strictObject({ date: partialDate, place: localizedString }),
  died: z.strictObject({ date: partialDate, place: localizedString }),
  lede: localizedString,
  body: localizedStringList,      // paragraphs; counts may differ per language
  pullQuote: z.strictObject({ text: localizedString, attribution: z.string().optional() }).optional(),
});
export type Biography = z.infer<typeof biographySchema>;

/* ---------- Exhibitions ---------- */
export const exhibitionSchema = z.strictObject({
  id: z.string().regex(/^EXH-\d{4}-\d{2}$/),
  date: partialDate,
  endDate: partialDate.optional(),
  title: localizedString,
  location: z.strictObject({
    venue: localizedString,
    city: localizedString,
    countryCode: z.string().length(2).toUpperCase(),
  }),
  type: z.enum(['solo', 'group']),
  albumId: z.string().optional(),   // links to a photo album from the opening
});
export const exhibitionListSchema = z.array(exhibitionSchema).superRefine(uniqueKeys('id'));
export type Exhibition = z.infer<typeof exhibitionSchema>;

/* ---------- Albums ---------- */
export const albumPhotoSchema = cdnImage.extend({
  id: z.string(),
  caption: localizedString.optional(),
  credit: z.string().optional(),
});
export const albumSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: localizedString,
  date: partialDate,
  description: localizedString.optional(),
  exhibitionId: z.string().optional(),
  coverPhotoId: z.string(),
  photos: z.array(albumPhotoSchema).min(1).superRefine(uniqueKeys('id')),
}).refine((a) => a.photos.some((p) => p.id === a.coverPhotoId), { message: 'coverPhotoId must reference a photo in the album', path: ['coverPhotoId'] });
export const albumListSchema = z.array(albumSchema).superRefine(uniqueKeys('id'));
export type Album = z.infer<typeof albumSchema>;
export type AlbumPhoto = z.infer<typeof albumPhotoSchema>;

/* ---------- Press ---------- */
export const pressItemSchema = z.strictObject({
  id: z.string().regex(/^PRESS-\d{4}-\d{3}$/),
  publishedAt: partialDate,
  publication: z.string().min(1),                   // proper noun, not translated
  headline: z.string().min(1),                      // original-language headline
  headlineLanguage: z.enum(['is', 'en', 'da', 'no', 'sv', 'de', 'other']),
  headlineTranslation: localizedString.partial().optional(),
  author: z.string().optional(),
  page: z.string().optional(),
  summary: localizedString.optional(),
  asset: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('pdf'), href: z.string().regex(/^\/press\/.+\.pdf$/), bytes: z.int().positive(), pages: z.int().positive().optional() }),
    z.strictObject({ kind: z.literal('image'), href: z.string().regex(/^\/press\/.+\.(jpe?g|png|webp)$/), width: z.int().positive(), height: z.int().positive(), bytes: z.int().positive() }),
  ]),
});
export const pressListSchema = z.array(pressItemSchema).superRefine(uniqueKeys('id'));
export type PressItem = z.infer<typeof pressItemSchema>;

/* ---------- Cross-file integrity ---------- */
/** Exhibition ↔ album links must resolve, and a two-way link must point back at the same record. */
export function aboutCrossRefIssues(
  exhibitions: readonly Pick<Exhibition, 'id' | 'albumId'>[],
  albums: readonly Pick<Album, 'id' | 'exhibitionId'>[],
): string[];   // human-readable issues; empty = valid
```

`scripts/validate-data.ts` (runs before `next build`, §0.6) parses all six data files with these schemas, runs `aboutCrossRefIssues`, and checks every press asset: the file exists under `public/`, `bytes` equals the file size, and for `kind: 'image'` the declared `width`×`height` matches the file (sharp metadata). It imports schemas only, never the `server-only` loaders.

Loaders in `src/lib/data/about.ts` (`server-only`) parse each file once (and throw on cross-ref issues) and return:

- `getBiography()`
- `getExhibitions()` — sorted ascending by `date` (string compare is correct for partial ISO dates), tie-break by `id`
- `getAlbums()` — sorted descending by `date`; `getAlbum(id)`
- `getPressItems()` — sorted descending by `publishedAt`

### 5.3 Biography

```json
// src/data/about/biography.json
{
  "portrait": {
    "src": "https://brynja.b-cdn.net/v1/archive/about/portrait-1979.jpg",
    "width": 1600,
    "height": 2000,
    "alt": { "is": "Svarthvít ljósmynd af listamanninum við teikniborð.", "en": "Black-and-white photograph of the artist at a drawing table." },
    "credit": "Ljósmyndari Óþekktur",
    "year": 1979
  },
  "born": { "date": "1942-01-08", "place": { "is": "Siglufirði", "en": "Siglufirði" } },
  "died": { "date": "2025-11-09", "place": { "is": "Reykjavík", "en": "Reykjavík" } },
  "lede": {
    "is": "Í meira en fimm áratugi teiknaði Brynja Árnadóttir landslag, fólk og byggingar með pennanum einum.",
    "en": "For more than five decades, Brynja Árnadóttir drew landscapes, people and buildings with nothing but a pen."
  },
  "body": {
    "is": ["Fyrsta málsgrein…", "Önnur málsgrein…", "Þriðja málsgrein…"],
    "en": ["First paragraph…", "Second paragraph…", "Third paragraph…"]
  },
  "pullQuote": {
    "text": { "is": "„Línan segir allt sem segja þarf.“", "en": "“The line says everything that needs saying.”" }
  }
}
```

> `1942` inside a `partialDate` must be replaced before `pnpm build`, or Zod validation will fail by design.

**Component (`Biography.tsx`, server)**

```text
┌───────────────────────────────┬─────────────────────────────────────────┐
│  PORTRAIT (sticky top-24)     │  1931 – 2019            ← eyebrow        │
│  4:5, ring-1 ring-rule        │  Lede (font-serif text-lede)             │
│  caption: Photo · credit, yr  │                                          │
│                               │  Paragraphs (max-w-prose, text-body,     │
│                               │  first paragraph drop-cap optional)      │
│                               │  ── pull quote (font-serif italic) ──    │
│                               │  Born / Died <dl>                        │
└───────────────────────────────┴─────────────────────────────────────────┘
grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-gutter; stacks on mobile
```

- Portrait: `next/image`, `sizes="(min-width:1024px) 40vw, 100vw"`, `quality={75}`, `loading="eager"`, `fetchPriority="high"` (LCP element of the page).
- Paragraphs rendered from `localize(bio.body, locale)` → `<p>` each, inside `.prose-archive`.
- Dates via `formatPartialDate`; `<time dateTime>` on both.
- JSON-LD `Person` on this page (Appendix A).

### 5.4 Exhibition Timeline

```json
// src/data/about/exhibitions.json
[
  {
    "id": "EXH-1968-01",
    "date": "1968-03-15",
    "endDate": "1968-03-30",
    "title": { "is": "Teikningar", "en": "Drawings" },
    "location": {
      "venue": { "is": "Bogasalurinn", "en": "Bogasalurinn Gallery" },
      "city": { "is": "Reykjavík", "en": "Reykjavík" },
      "countryCode": "IS"
    },
    "type": "solo"
  },
  {
    "id": "EXH-1985-02",
    "date": "1985-09",
    "title": { "is": "Norræn teikning", "en": "Nordic Drawing" },
    "location": {
      "venue": { "is": "Kjarvalsstaðir", "en": "Kjarvalsstaðir" },
      "city": { "is": "Reykjavík", "en": "Reykjavík" },
      "countryCode": "IS"
    },
    "type": "group",
    "albumId": "opening-1985-kjarvalsstadir"
  }
]
```

**Component (`ExhibitionTimeline.tsx`, server, zero JS)**

- Groups by decade: `Math.floor(year / 10) * 10`.
- Semantic structure: `<section>` per decade → `<h2>` (e.g. `1960–1969`) → `<ol>` → `<li>` per exhibition.
- Each item: `<time dateTime={date}>` (formatted with `formatPartialDate`; ranges as `start – end`), `<h3 class="font-serif text-lede">` title, venue · city, type label (`solo`/`group` from dictionary), optional link "→ Myndaalbúm / Photo album" when `albumId` is set.
- Visual: two-column grid `md:grid-cols-[10rem_1fr]`, decade label sticky (`md:sticky md:top-24`), 1px vertical `border-l border-rule` on the list with 7px ink dots (`before:` pseudo-element) per item.

```tsx
// src/components/about/ExhibitionTimeline.tsx (core)
const groups = Map.groupBy(items, (e) => Math.floor(Number(e.date.slice(0, 4)) / 10) * 10);

return (
  <div className="flex flex-col">
    {[...groups].map(([decade, list]) => (
      <section key={decade} aria-labelledby={`decade-${decade}`} className="grid gap-x-gutter border-t border-rule py-stack md:grid-cols-[10rem_1fr]">
        <h2 id={`decade-${decade}`} className="font-serif text-title tabular-nums md:sticky md:top-24 md:self-start">
          {decade}–{decade + 9}
        </h2>
        <ol className="relative mt-6 flex flex-col gap-8 border-l border-rule pl-6 md:mt-0">
          {list.map((e) => (
            <li key={e.id} className="relative before:absolute before:-left-[calc(1.5rem+3.5px)] before:top-2 before:size-[7px] before:rounded-full before:bg-ink">
              <time dateTime={e.date} className="text-caption tabular-nums text-ink-muted">
                {formatPartialDate(e.date, locale)}{e.endDate ? ` – ${formatPartialDate(e.endDate, locale)}` : ''}
              </time>
              <h3 className="mt-1 font-serif text-lede">{localize(e.title, locale)}</h3>
              <p className="mt-1 text-caption text-ink-muted">
                {localize(e.location.venue, locale)}, {localize(e.location.city, locale)} · {t.exhibitions[e.type]}
              </p>
            </li>
          ))}
        </ol>
      </section>
    ))}
  </div>
);
```

(`Map.groupBy` requires Node ≥ 21 / ES2024 lib; set `"lib": ["ES2024", "DOM", "DOM.Iterable"]` in `tsconfig.json`, or implement a small `groupBy` helper.)

### 5.5 Gallery Photo Albums (archival snapshots)

```json
// src/data/about/albums.json
[
  {
    "id": "opening-1985-kjarvalsstadir",
    "title": { "is": "Opnun á Kjarvalsstöðum", "en": "Opening at Kjarvalsstaðir" },
    "date": "1985-09",
    "exhibitionId": "EXH-1985-02",
    "coverPhotoId": "p01",
    "photos": [
      {
        "id": "p01",
        "src": "https://brynja.b-cdn.net/v1/archive/albums/1985-kjarvalsstadir/p01.jpg",
        "width": 900,
        "height": 600,
        "alt": { "is": "Gestir skoða teikningar á opnun.", "en": "Guests viewing drawings at the opening." },
        "caption": { "is": "Opnunarkvöld, september 1985.", "en": "Opening night, September 1985." },
        "credit": "Úr einkasafni fjölskyldunnar"
      }
    ]
  }
]
```

**Performance rules for low-resolution archival photos**

| Rule | Implementation |
|---|---|
| Never upscale | Lightbox `<Image>` gets `style={{ maxWidth: photo.width }}` and `sizes={\`(min-width: ${photo.width}px) ${photo.width}px, 100vw\`}` so the browser never requests more pixels than exist |
| Small thumbnails | Fixed `aspect-4/3` + `object-cover`, `quality={70}`, `sizes="(min-width:1024px) 22vw, (min-width:640px) 33vw, 50vw"`. A cropped box upscales when it is wider than the photo *or* taller than it, so thumbnails, album covers and the 4:5 biography portrait get `style={{ maxWidth: maxCoverWidth(width, height, ratio) }}` = `min(width, ⌊height × ratio⌋)` (`src/lib/images/archival.ts`) |
| Lazy everything | Default `loading="lazy"`; only the first 4 thumbnails eager on album pages |
| Long albums | `[content-visibility:auto] [contain-intrinsic-size:auto_220px]` on each grid item |
| Authenticity | No sharpening, filters, colourisation or AI upscaling — archival record shown as-is |
| Placeholders | `blurDataURL` from the script; fallback `bg-mat` |

**Components**

- `AlbumIndexGrid` (server): cards with cover photo, title, formatted date, photo count via `plural()`; links to `/[locale]/about/albums/[albumId]`.
- `AlbumPhotoGrid` (client): `grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4`, each thumbnail a `<button>` opening a lightweight native `<dialog>` (state: `openIndex: number | null`), ←/→ navigation, caption + credit below the photo, `Esc` closes. No route interception (archival photos don't need deep links).
- `albums/[albumId]/page.tsx`: `generateStaticParams` returns `{ albumId }` per album (parent supplies `locale`); unknown → `notFound()`; header shows title, date, description, and a back-link to the linked exhibition if any.

### 5.6 Press & Media Archive

```json
// src/data/about/press.json
[
  {
    "id": "PRESS-1974-001",
    "publishedAt": "1974-05-18",
    "publication": "Morgunblaðið",
    "headline": "Línan sem lifir",
    "headlineLanguage": "is",
    "headlineTranslation": { "en": "The Line That Lives" },
    "author": "J. Jónsson",
    "page": "14",
    "summary": {
      "is": "Umfjöllun um fyrstu einkasýningu listamannsins.",
      "en": "Review of the artist's first solo exhibition."
    },
    "asset": { "kind": "pdf", "href": "/press/1974-05-18-morgunbladid.pdf", "bytes": 2348123, "pages": 2 }
  },
  {
    "id": "PRESS-1991-002",
    "publishedAt": "1991-11",
    "publication": "DV",
    "headline": "Teiknarinn í Vesturbænum",
    "headlineLanguage": "is",
    "headlineTranslation": { "en": "The Draughtsman of Vesturbær" },
    "asset": { "kind": "image", "href": "/press/1991-11-02-dv-clipping.jpg", "width": 1800, "height": 2600, "bytes": 812044 }
  }
]
```

> Rights: confirm reproduction permission with each publication (or rely on applicable archival/fair-dealing provisions after legal review) before publishing clippings.

**Component (`PressArchiveList.tsx`, server)**

```text
┌──────────────┬──────────────────────────────────────────────────────┬──────────────────┐
│ 18. maí 1974 │ MORGUNBLAÐIÐ · bls. 14                  (eyebrow)    │ Opna úrklippu ↗  │
│  (tabular)   │ Línan sem lifir                    (font-serif lede) │ PDF · 2,3 MB     │
│              │ The Line That Lives  ← only on /en, lang="en", muted │                  │
│              │ Summary (text-caption, ink-muted)                    │                  │
└──────────────┴──────────────────────────────────────────────────────┴──────────────────┘
<ul> of <li> rows, divide-y divide-rule; grid md:grid-cols-[9rem_1fr_auto]
```

- Original headline wrapped in `<span lang={headlineLanguage}>`; translation shown when `headlineTranslation[locale]` exists and differs from the original language.
- File link: `href={asset.href}`, `target="_blank"`, `rel="noopener"`, accessible name `"{open}: {headline} ({PDF|Image}, 2,3 MB)" + opensInNewTab`. Size via `formatFileSize(bytes, locale)` (`src/lib/i18n/format.ts`): decimal units, `Intl.NumberFormat(locale, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1 })` from 999 950 bytes up, otherwise `unit: 'kilobyte'` with the same options — megabytes alone would print small scans as "0 MB". 2 348 123 → "2,3 MB" / "2.3 MB"; 12 664 → "12,7 kB" / "12.7 kB".
- `kind: 'image'` items additionally render a 64 px thumbnail via `next/image` (local `/press/...` path — no remotePatterns needed).
- Year jump links (`#y1974`) rendered above the list when more than 15 items.

### 5.7 Social link (Facebook only)

```json
// src/data/site.json
{
  "artist": { "name": "Brynja Árnadóttir", "born": "1942", "died": "2025" },
  "social": {
    "facebook": { "url": "https://www.facebook.com/profile.php?id=100028409782920" }
  }
}
```

```ts
// src/data/schema/site.ts
import { z } from 'zod';

export const siteSchema = z.strictObject({
  artist: z.strictObject({ name: z.string(), born: z.string(), died: z.string() }),
  // strictObject: any key other than `facebook` (e.g. "instagram") fails the build.
  social: z.strictObject({
    facebook: z.strictObject({ url: z.url().regex(/^https:\/\/(www\.)?facebook\.com\//) }),
  }),
});
export type Site = z.infer<typeof siteSchema>;
```

```ts
// src/lib/data/site.ts
import 'server-only';
import raw from '@/data/site.json';
import { siteSchema, type Site } from '@/data/schema/site';

// Parsed once at module load → invalid JSON (e.g. an `instagram` key) fails `next build`.
const site: Site = siteSchema.parse(raw);

export const getSite = (): Site => site;
```

```tsx
// src/components/icons/FacebookIcon.tsx
import { siFacebook } from 'simple-icons';

/** Official Facebook mark path from the `simple-icons` package; render unmodified, monochrome. */
export function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg role="img" aria-hidden="true" viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d={siFacebook.path} />
    </svg>
  );
}
```

```tsx
// src/components/layout/SocialLink.tsx
import { FacebookIcon } from '@/components/icons/FacebookIcon';

export function SocialLink({ url, label, newTabHint }: { url: string; label: string; newTabHint: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="me noopener noreferrer"
      aria-label={`${label} ${newTabHint}`}
      className="grid size-11 place-items-center text-ink-muted transition-colors hover:text-ink"
    >
      <FacebookIcon className="size-5" />
    </a>
  );
}
```

Footer layout: thin top rule, `max-w-wide px-gutter py-10`, left: `rights` line (`text-caption text-ink-subtle`), right: `<SocialLink>`. Exactly one social link exists anywhere in the codebase.

---

## 6. Visual System & Tailwind Design Tokens

### 6.1 Principles

1. **The art is the only colour.** All UI chrome is strictly achromatic (OKLCH chroma = 0). No tinted greys, no brand accent near artwork. This prevents chromatic interference with vibrant ink and keeps monochrome work crisp.
2. **High contrast, quiet surfaces.** Near-black ink on a near-white canvas; hairline rules instead of boxes, shadows or cards.
3. **Mat logic.** Artwork sits on a *mat* token whose value depends on the work's ink profile (`data-ink="mono" | "color"`) and an optional viewer override (`data-mat`). Monochrome → bright neutral (paper reads as paper); colour → deep neutral (pigment reads at full saturation).
4. **Typography carries the voice.** A classical serif for titles and names; a neutral grotesque for UI, numbers and metadata (tabular figures).
5. **Motion is minimal**: fades ≤ 250 ms, no parallax, honour `prefers-reduced-motion`.
6. **Functional colour only in forms** (`danger`, `success`), never adjacent to an artwork image.

### 6.2 Fonts

```ts
// src/app/fonts.ts
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
```

### 6.3 Global CSS & Tailwind v4 theme (`src/app/globals.css`)

```css
@import "tailwindcss";

/* Tailwind auto-detects sources; keep the spec's example classes (incl. forbidden ones) out of the CSS. */
@source not "../../docs";

/* ───────────────────────────── 1. Raw tokens (runtime CSS variables) ───────────────────────────── */
:root {
  /* Achromatic ramp — chroma 0 guarantees zero hue cast next to coloured ink */
  --neutral-0: oklch(1 0 0);
  --neutral-25: oklch(0.985 0 0);
  --neutral-50: oklch(0.97 0 0);
  --neutral-100: oklch(0.945 0 0);
  --neutral-200: oklch(0.905 0 0);
  --neutral-300: oklch(0.85 0 0);
  --neutral-400: oklch(0.7 0 0);
  --neutral-500: oklch(0.55 0 0);
  --neutral-600: oklch(0.45 0 0);
  --neutral-700: oklch(0.36 0 0);
  --neutral-800: oklch(0.27 0 0);
  --neutral-900: oklch(0.2 0 0);
  --neutral-950: oklch(0.15 0 0);

  /* Semantic roles */
  --canvas: var(--neutral-25);       /* page background */
  --surface: var(--neutral-0);       /* panels, inputs, lightbox aside */
  --ink: var(--neutral-950);         /* primary text  (~17.8:1 on canvas) */
  --ink-muted: var(--neutral-600);   /* secondary text (~7.4:1) */
  --ink-subtle: var(--neutral-500);  /* tertiary/eyebrows (~4.9:1, AA) */
  --rule: var(--neutral-200);
  --rule-strong: var(--neutral-300);
  --focus: var(--neutral-950);
  --scrim: oklch(0.12 0 0 / 0.94);

  /* Mat (artwork backdrop) — default for thumbnails */
  --mat: var(--neutral-50);
  --mat-ink: var(--neutral-950);

  /* Functional (forms only) */
  --danger: oklch(0.5 0.16 27);
  --success: oklch(0.48 0.09 155);

  /* Layout */
  --header-h: 4rem;
}

/* Mat by ink profile (set on <dialog data-ink> / detail view wrapper) */
[data-ink="mono"]  { --mat: var(--neutral-0);   --mat-ink: var(--neutral-950); }
[data-ink="color"] { --mat: var(--neutral-900); --mat-ink: var(--neutral-50); }

/* Viewer override — declared AFTER [data-ink] so equal specificity resolves in its favour */
[data-mat="light"] { --mat: var(--neutral-0);   --mat-ink: var(--neutral-950); }
[data-mat="dark"]  { --mat: var(--neutral-950); --mat-ink: var(--neutral-50); }

/* ───────────────────────────── 2. Tailwind theme mapping ───────────────────────────── */
@theme inline {
  /* Remove Tailwind's default palette → raw colours like bg-gray-100 / text-blue-500 cannot be used */
  --color-*: initial;

  --color-canvas: var(--canvas);
  --color-surface: var(--surface);
  --color-ink: var(--ink);
  --color-ink-muted: var(--ink-muted);
  --color-ink-subtle: var(--ink-subtle);
  --color-rule: var(--rule);
  --color-rule-strong: var(--rule-strong);
  --color-focus: var(--focus);
  --color-scrim: var(--scrim);
  --color-mat: var(--mat);
  --color-mat-ink: var(--mat-ink);
  --color-danger: var(--danger);
  --color-success: var(--success);

  /* Families */
  --font-serif: var(--font-garamond), "EB Garamond", ui-serif, Georgia, serif;
  --font-sans: var(--font-inter), "Inter", ui-sans-serif, system-ui, sans-serif;

  /* Type scale (fluid) — utilities: text-display, text-title, text-lede, text-body, text-caption, text-eyebrow */
  --text-display: clamp(2.75rem, 1.6rem + 4.6vw, 5.5rem);
  --text-display--line-height: 1.02;
  --text-display--letter-spacing: -0.02em;
  --text-title: clamp(1.75rem, 1.35rem + 1.6vw, 2.75rem);
  --text-title--line-height: 1.1;
  --text-title--letter-spacing: -0.01em;
  --text-lede: clamp(1.1875rem, 1.05rem + 0.55vw, 1.5rem);
  --text-lede--line-height: 1.45;
  --text-body: 1.0625rem;
  --text-body--line-height: 1.7;
  --text-caption: 0.8125rem;
  --text-caption--line-height: 1.5;
  --text-caption--letter-spacing: 0.01em;
  --text-eyebrow: 0.6875rem;
  --text-eyebrow--line-height: 1.4;
  --text-eyebrow--letter-spacing: 0.14em;

  /* Named spacing — utilities: p-gutter, gap-gutter, py-section, gap-stack, … */
  --spacing-gutter: clamp(1rem, 0.5rem + 2.5vw, 2.5rem);
  --spacing-stack: clamp(1.5rem, 1rem + 2vw, 3rem);
  --spacing-section: clamp(4rem, 2rem + 8vw, 9rem);

  /* Containers — utilities: max-w-prose-archive, max-w-wide, max-w-gallery */
  --container-prose-archive: 38rem;
  --container-wide: 90rem;
  --container-gallery: 112rem;

  /* Radii — square by default */
  --radius-*: initial;
  --radius-xs: 2px;
  --radius-full: 9999px;

  /* Motion */
  --ease-archive: cubic-bezier(0.22, 1, 0.36, 1);
  --animate-fade-in: fade-in 250ms var(--ease-archive) both;

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}

/* Ink-profile variants: ink-mono:… / ink-color:… */
@custom-variant ink-mono (&:where([data-ink="mono"], [data-ink="mono"] *));
@custom-variant ink-color (&:where([data-ink="color"], [data-ink="color"] *));

/* ───────────────────────────── 3. Base ───────────────────────────── */
@layer base {
  html {
    color-scheme: light;
    -webkit-text-size-adjust: 100%;
    text-rendering: optimizeLegibility;
    scroll-padding-top: calc(var(--header-h) + 1rem);
  }
  body {
    font-feature-settings: "kern", "liga", "calt";
    font-optical-sizing: auto;
  }
  ::selection { background: var(--ink); color: var(--canvas); }
  :focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
  dialog :focus-visible { outline-color: var(--mat-ink); }
  html:has(dialog[open]) { overflow: hidden; }
  dialog::backdrop { background: var(--scrim); }

  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}

/* ───────────────────────────── 4. Components (minimal, prose only) ───────────────────────────── */
@layer components {
  .prose-archive {
    max-width: var(--container-prose-archive);
    font-size: var(--text-body);
    line-height: var(--text-body--line-height);
    hyphens: auto;          /* effective for Icelandic long compounds with lang="is" */
    overflow-wrap: break-word;
  }
  .prose-archive > p + p { margin-top: 1.25em; }
  .prose-archive > p:first-of-type::first-letter {
    font-family: var(--font-serif);
    float: left;
    font-size: 3.4em;
    line-height: 0.85;
    padding: 0.06em 0.08em 0 0;
  }
}
```

> **Do not** set a site-wide dark mode. The canvas is a gallery wall; darkness is reserved for the colour-work mat and the lightbox scrim.

### 6.4 Class-naming strategy

| Rule | Example | Forbidden |
|---|---|---|
| Use semantic tokens only | `bg-canvas text-ink border-rule` | `bg-gray-50`, `text-black`, hex in arbitrary values (default palette is removed, so these fail) |
| Typography via scale utilities | `font-serif text-title`, `text-caption tabular-nums` | `text-[23px]`, ad-hoc `leading-*` on scale text |
| Layout spacing via named tokens | `px-gutter`, `py-section`, `gap-stack` | Unexplained `px-[37px]` |
| State via ARIA/data variants | `aria-[current=page]:text-ink`, `aria-pressed:underline`, `aria-invalid:border-danger`, `has-checked:bg-ink`, `data-[state=open]:…` | Parallel `isActive ? 'a' : 'b'` strings when an attribute already exists |
| Ink-context styling | `ink-color:text-mat-ink`, `ink-mono:ring-rule` | Branching on category in JS for purely visual changes |
| Merge with `cn()` | `cn('px-3', className)` | String concatenation of conflicting utilities |
| `@apply` | Only inside `@layer components` for `.prose-archive` | Component classes that duplicate utilities |
| Class order | Enforced by `prettier-plugin-tailwindcss` | Manual ordering debates |
| Artwork images | Bare `<Image>` + optional `ring-1 ring-rule` (mono only) | `rounded-*`, `shadow-*`, `opacity-*`, `grayscale`, `blur`, `mix-blend-*` |

```ts
// src/lib/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge the custom scales so `text-caption` (size) and `text-ink` (colour) don't collide.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: ['canvas', 'surface', 'ink', 'ink-muted', 'ink-subtle', 'rule', 'rule-strong', 'focus', 'scrim', 'mat', 'mat-ink', 'danger', 'success'],
      text: ['display', 'title', 'lede', 'body', 'caption', 'eyebrow'],
      spacing: ['gutter', 'stack', 'section'],
      container: ['prose-archive', 'wide', 'gallery'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 6.5 Component token map

| Element | Classes |
|---|---|
| Page wrapper | `mx-auto max-w-wide px-gutter` |
| Section spacing | `py-section` (hero/major), `pt-stack` (sub-sections) |
| Hero name | `font-serif text-display` + lifespan `text-caption tabular-nums text-ink-muted` |
| Eyebrow | `text-eyebrow uppercase text-ink-subtle` |
| Section heading | `font-serif text-title` |
| Body copy | `prose-archive` or `text-body max-w-prose-archive` |
| Metadata | `text-caption text-ink-muted tabular-nums` |
| Hairline | `border-rule` (1px); stronger dividers `border-rule-strong` |
| Primary button | `bg-ink text-canvas text-caption uppercase tracking-[0.14em] px-6 py-3 hover:opacity-90` |
| Text link | `underline decoration-1 underline-offset-4 hover:decoration-2` |
| Artwork thumbnail frame | `bg-mat` + `ring-1 ring-rule` (mono) |
| Lightbox | `bg-mat text-mat-ink backdrop:bg-scrim`; aside `bg-surface text-ink` |
| Input | `border border-rule-strong bg-surface focus:border-ink aria-invalid:border-danger` |

### 6.6 Tailwind v3 fallback (only if the project is pinned to Tailwind 3.x)

Keep §6.3 sections 1, 3 and 4 in `globals.css` (with `@tailwind base; @tailwind components; @tailwind utilities;` instead of `@import "tailwindcss"`), then:

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      // Replaces (not extends) the default palette
      transparent: 'transparent',
      current: 'currentColor',
      canvas: 'var(--canvas)', surface: 'var(--surface)',
      ink: { DEFAULT: 'var(--ink)', muted: 'var(--ink-muted)', subtle: 'var(--ink-subtle)' },
      rule: { DEFAULT: 'var(--rule)', strong: 'var(--rule-strong)' },
      focus: 'var(--focus)', scrim: 'var(--scrim)',
      mat: { DEFAULT: 'var(--mat)', ink: 'var(--mat-ink)' },
      danger: 'var(--danger)', success: 'var(--success)',
    },
    borderRadius: { none: '0', xs: '2px', full: '9999px' },
    extend: {
      fontFamily: {
        serif: ['var(--font-garamond)', 'EB Garamond', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['clamp(2.75rem, 1.6rem + 4.6vw, 5.5rem)', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        title: ['clamp(1.75rem, 1.35rem + 1.6vw, 2.75rem)', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        lede: ['clamp(1.1875rem, 1.05rem + 0.55vw, 1.5rem)', { lineHeight: '1.45' }],
        body: ['1.0625rem', { lineHeight: '1.7' }],
        caption: ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        eyebrow: ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.14em' }],
      },
      spacing: {
        gutter: 'clamp(1rem, 0.5rem + 2.5vw, 2.5rem)',
        stack: 'clamp(1.5rem, 1rem + 2vw, 3rem)',
        section: 'clamp(4rem, 2rem + 8vw, 9rem)',
      },
      maxWidth: { 'prose-archive': '38rem', wide: '90rem', gallery: '112rem' },
      transitionTimingFunction: { archive: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      keyframes: { 'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } } },
      animation: { 'fade-in': 'fade-in 250ms cubic-bezier(0.22, 1, 0.36, 1) both' },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant('ink-mono', ':is([data-ink="mono"] &, [data-ink="mono"]&)');
      addVariant('ink-color', ':is([data-ink="color"] &, [data-ink="color"]&)');
    }),
  ],
} satisfies Config;
```

---

## Appendix A — SEO, Metadata & Structured Data

- Every page exports `generateMetadata` with a localized `title`, `description`, `alternates: alternatesFor(locale, path)` (canonical + `hreflang` for `is`, `en`, `x-default → /is`), and `openGraph: openGraphFor(locale, siteTitle, path, { title, images? })` (`src/lib/seo/metadata.ts`). Next **replaces** rather than merges a parent's `openGraph` when a page sets its own, so going through the helper keeps `og:locale`, `og:locale:alternate`, `og:site_name` and `og:url` on every page.
- The public origin comes from `siteUrl()` (`src/lib/seo/site-url.ts`: `NEXT_PUBLIC_SITE_URL`, falling back to `http://localhost:3000`). It is used for `metadataBase`, the sitemap and robots. Not `getServerEnv()`, which also requires the Resend secrets.
- `src/app/sitemap.ts`: one entry per route × locale, each with `alternates.languages` for both locales; artworks and albums enumerated from data loaders.
- `src/app/robots.ts`: allow all; `sitemap: ${NEXT_PUBLIC_SITE_URL}/sitemap.xml`.
- Open Graph images: static `/og-default.jpg`; artwork pages use `bunnyTransform(src, { width: 1200 })`.
- JSON-LD rendered via `<JsonLd data={…} />` (`src/components/seo/JsonLd.tsx`), i.e. `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />`:
  - Biography → `Person` (`name`, `birthDate`, `deathDate`, `birthPlace`, `deathPlace`, `image`, `sameAs: [facebookUrl]`).
  - Artwork page → `VisualArtwork` (`name`, `image`, `dateCreated`, `artMedium`, `artform: "Drawing"`, `width`/`height` as `Distance` in cm, `creator: { @type: Person, name }`, `inLanguage`).

## Appendix B — Performance & Accessibility Budget

| Metric (mobile, Lighthouse/PageSpeed) | Target |
|---|---|
| Performance | ≥ 95 |
| Accessibility / Best Practices / SEO | 100 |
| LCP | < 2.0 s |
| CLS | < 0.02 |
| INP | < 150 ms |
| First-load JS, gallery route | < 110 kB gzip |

- All pages statically generated (`○`/`●` in build output); only the Server Action executes at runtime.
- Exactly one high-priority image per page (first gallery row / portrait / lightbox image).
- WCAG 2.2 AA: visible focus, 44×44 px targets for icon buttons, `lang` correct per page and per foreign-language span, dialogs labelled, live regions for filter counts and form status, colour never the sole carrier of state.
- Optional: `@vercel/speed-insights` (add its endpoints to CSP `connect-src`/`script-src` if enabled).

## Appendix C — Implementation Phases (for Claude Code)

Each phase ends with `pnpm typecheck && pnpm lint && pnpm test && pnpm build` passing.

| # | Phase | Deliverables | Acceptance |
|---|---|---|---|
| 0 | Scaffold | `create-next-app` (TS, App Router, `src/`, Tailwind, ESLint); install `zod resend react-email clsx tailwind-merge simple-icons server-only`; dev: `@react-email/ui vitest vite tsx sharp prettier prettier-plugin-tailwindcss typescript@^6`; tsconfig strict + `noUncheckedIndexedAccess`; `.env.example` | Clean build of empty app |
| 1 | Design system | `globals.css` (§6.3), `fonts.ts`, `cn.ts` | `bg-gray-100` produces no CSS; tokens render (regression-tested in `src/app/globals.test.ts`) |
| 2 | i18n & routing | `config.ts`, `proxy.ts`, `[locale]/layout.tsx`, dictionaries + `satisfies`, `I18nProvider`, Header, LanguageToggle, Footer, `not-found`, `error`, `[...rest]`, `@modal/default`, placeholder `(portfolio)/page.tsx`. Pulled forward because these depend on them: `schema/inquiry.ts` (error codes), `site.json` + `schema/site.ts` + `lib/data/site.ts`, `FacebookIcon`, `SocialLink` | `/` → `/is`; cookie `en` → `/en`; `/IS/x` → 308; toggle preserves path + query; `<html lang>` correct; unknown path shows localized 404 |
| 3 | Data layer | All schemas, sample JSON, loaders, `validate-data.ts`, blur script | Invalid JSON (e.g. duplicate slug, `instagram` key) fails build |
| 4 | Gallery | `filters.ts` + tests, `Gallery`, `GalleryFilters`, `SegmentedControl`, `ArtworkGrid`, `ArtworkCard`, Suspense fallback | 6 filter combinations correct; URL reflects state; no CLS; server HTML contains all artworks |
| 5 | Lightbox | `@modal` slot, intercepted + full-page routes, `LightboxDialog`, `LightboxNav`, `ArtworkDetailView`, `ReprintPanel` | Criteria in §3.7 |
| 6 | Inquiry | Schema, env, Resend client, `sendInquiry`, email template, form components | Each error code renders in both locales; success path delivers email in Resend dashboard; honeypot path sends nothing; works with JS disabled |
| 7 | Legacy sections | About layout/nav, Biography, Timeline, Albums (index + detail), Press | Sorting & date formatting correct in `is` and `en`; archival photos never upscaled |
| 8 | SEO & hardening | Metadata, sitemap, robots, JSON-LD, security headers | Rich Results test passes; headers present on production |
| 9 | QA | Lighthouse on `/is`, `/en/about/press`, a work page; keyboard-only run-through; screen-reader spot check | Appendix B targets met |

## Appendix D — Testing

- **Vitest unit**: `lib/gallery/filters.ts`, `lib/i18n/format.ts` (partial dates in both locales incl. UTC edge at midnight, plural forms incl. Icelandic `21 → one`), `lib/i18n/localize.ts` fallback, `inquirySchema` (each error code reachable; whitespace trimming; email lowercasing).
- **Data validation**: `pnpm data:validate`, chained into `pnpm build` (§0.6). `scripts/validate-data.test.ts` runs it against the committed data and against a deliberately broken copy.
- **Server Action**: unit-test `sendInquiry` with `vi.mock('@/lib/email/resend')` (and `@/lib/env`) covering honeypot, validation failure, broken hidden context, `too_fast`, unstamped (no-JS) `startedAt`, unknown artwork, non-reprint artwork, Resend error, Resend throwing, invalid env, success (server-side title, not the submitted one). Every case asserts that no PII reaches `console.error`.
- **E2E (Playwright)**, `pnpm test:e2e`, in `e2e/`. `lightbox.spec.ts` (Phase 5): every §3.7 criterion + hard refresh; "←/→ in form" runs against the real form fields. `inquiry.spec.ts` (Phase 6): JS validation round-trip + focus + Back in the lightbox; with `javaScriptEnabled: false`, the CTA reveals the form, a POST renders localized field errors with values kept, Back returns to the CTA, and a honeypot POST renders success. None of these send email. `about.spec.ts` (Phase 7), for `/is` and `/en`: AboutNav current item, biography year-only dates + `Person` JSON-LD, timeline order/decades/date ranges, album index + dialog (←/→, Esc restores focus), album ↔ exhibition links, unknown album → 404, press order/dates/file type + size in the link's accessible name, translation only on `/en`, one footer link; and at 2560×1440 no image renders larger than its declared `width`×`height`. `seo.spec.ts` (Phase 8): security headers on `/is` and no `X-Powered-By`; immutable `Cache-Control` on `/press/*`; `/sitemap.xml`, `/robots.txt`, `/og-default.jpg` served without a locale redirect; no console errors or `securitypolicyviolation` events on the main routes, the lightbox + reprint form (incl. client-side validation) and the album dialog. `Person` and `VisualArtwork` are not Google rich-result types, so the Rich Results Test reports "no items" for them; validate with the Schema Markup Validator (validator.schema.org) against a deployed URL. Still to add: locale redirect, toggle, inquiry happy path against a mocked action.
