# QA checklist (Phase 9)

These checks can't be automated well, so they need a person. Everything that could be automated
is already covered by `pnpm test` and `pnpm test:e2e`, including `e2e/a11y.spec.ts`. Budgets are in
SPEC Appendix B.

Tick each box, and write the date, device and browser next to any failure.

---

## 0. Automated baseline (2026-11-09)

Lighthouse 13.6.0, mobile preset (simulated throttling). Each figure is the median of 3 runs
against `pnpm start` on localhost, after one warm-up run to fill the image cache.

| URL | Perf | A11y | Best Pr. | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/is` | **91** | 100 | 100 | 100 | 3.6 s | 0.000 | 42 ms |
| `/en/about/press` | 100 | 100 | 100 | 100 | 0.8 s | 0.000 | 30 ms |
| `/is/works/brjost` | **90** | 100 | 100 | 100 | 3.6 s | 0.000 | 78 ms |

Before the Phase 9 fixes, `/is` scored 77 and `/is/works/brjost` 78, with LCP around 6 s and Best
Practices 96 on all three pages.

**Still open: Performance ≥ 95 and LCP < 2.0 s on the gallery and work pages.**
- Lighthouse's simulated LCP counts every byte requested before the image paints. That includes
  the ~210 kB of framework JS and the font preloads, even though they don't block the image.
- Check with PageSpeed Insights against the Vercel deployment before doing more work here. Vercel
  serves brotli over HTTP/2, and the CDN is warm, so the result may differ from localhost.

First-load JS for the gallery (`pnpm bundle:stats`) is 145.1 kB gzip in total, of which 16.2 kB is
app code. Both are within budget.

### How to re-run

```sh
# Build with the canonical URL pointing at the audited origin (a shell override only; .env is untouched).
NEXT_PUBLIC_SITE_URL=http://localhost:3210 pnpm build
pnpm start --port 3210 &
pnpm bundle:stats

# Never npx (CLAUDE.md). Pin the version. Run once to warm /_next/image (the masters are ~13 MB),
# then 3 times and take the median.
CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" \
  pnpm dlx lighthouse@13.6.0 http://localhost:3210/is \
  --chrome-flags="--headless=new" --output=html --output-path=./lh-is.html
```

Rebuild without the override before deploying.

---

## 1. Keyboard-only run-through

Use desktop Chrome or Firefox and put the mouse away. At every step, focus must be visible and must
never be hidden behind the sticky header or the lightbox nav bar.

**Gallery `/is`**
- [ ] First Tab shows **Fara beint í efni / Skip to content**. Enter moves focus to the main content.
- [ ] Tab order is logo → nav → language toggle → filters → cards. Nothing invisible gets focus.
- [ ] In each filter group, Tab enters the group once and ←/→ change the option. The result count
      updates, and disabled (0) options are skipped.
- [ ] Choose a filter, then activate the language toggle. You land on `/en` with the same query
      string, and focus starts at the top of the page.
- [ ] Enter on a card opens the lightbox, and focus is inside the dialog.

**Lightbox**
- [ ] Tab cycles only inside the dialog: mat toggle, **Open as page**, close, prev/next, details
      panel, **Buy a Reprint**.
- [ ] Enter on Next: the work changes and focus stays on Next. Repeat several times.
- [ ] ←/→ (with focus outside a form field) change the work.
- [ ] Choose the dark mat (colour work, e.g. *Brjóst*). The focus ring is light on the mat and
      near-black in the white details panel.
- [ ] Esc closes the dialog, and focus returns to the card of the work last shown.

**Reprint form** (in the lightbox and at `/en/works/upprisa`)
- [ ] **Buy a Reprint** opens the form and focus moves to its heading.
- [ ] The intro says that all fields are required.
- [ ] Submit with the form empty. Focus goes to the first invalid field, the ring is visible on the
      red-bordered field, and each error is shown as text.
- [ ] On a phone-sized window (DevTools device mode), tab to the submit button. It isn't hidden
      under the fixed prev/next bar.
- [ ] **Back** closes the form and returns focus to **Buy a Reprint**.
- [ ] ←/→ while typing in a field move the caret only. They don't change the work.

**About section**
- [ ] AboutNav: the current page is underlined, not just coloured, and the focus ring isn't cut off
      at the top or bottom.
- [ ] Exhibitions: the order looks right, and links to albums work.
- [ ] Albums: Enter on a thumbnail opens the photo dialog and the ring around the thumbnail is
      complete. ←/→ move between photos. Esc restores focus to the last photo shown.
- [ ] Press: each **Open clipping ↗** link opens the file in a new tab.

**Errors**
- [ ] `/is/does-not-exist`: the localized 404 appears, and the nav and toggle still work.

## 2. Screen-reader spot check

Use NVDA with Firefox (Windows), plus VoiceOver on iOS for one pass of the gallery and the
lightbox. Listen for the language switching voices: Icelandic text should be read with the
Icelandic voice.

- [ ] `/is`: the page title is read, and the main landmark, the h1, and h2 "Verk" (sr-only) are
      present.
- [ ] Changing a filter announces the new count once, e.g. "3 verk", with no repeated
      announcements.
- [ ] The language toggle on `/is` is read as "English – view this page in English" in the English
      voice. On `/en` it is read as "Íslenska – skoða þessa síðu á íslensku" in the Icelandic voice.
- [ ] Opening a work announces a dialog named with the work's title.
- [ ] The mat buttons announce pressed / not pressed.
- [ ] Reprint form: each field is announced as required. After a failed submit, the focused field
      is read as invalid along with its error message.
- [ ] Reprint form: after a successful (or honeypot) submit, the thank-you heading is read.
- [ ] `/en/about/press`: each file link is read as "Open clipping: ‹Icelandic headline in the
      Icelandic voice› (PDF, 2.3 MB) (opens in a new tab)". The English translation line below it
      uses the English voice.
- [ ] `/en/about` (biography): the pull quote is read in full, with its attribution after it.
      Icelandic names are proper nouns without `lang`, so the English voice is expected there.
- [ ] Album photo dialog: the caption is read when the dialog opens, and "3 of 12"-style progress
      is announced on ←/→.

## 3. Mobile Safari (real iPhone, deployed URL)

Use the Vercel Preview or Production URL. Localhost won't do: the CSP sends
`upgrade-insecure-requests` and HSTS, which Safari applies even to `http://localhost`.

- [ ] `/is` loads with no mixed-content warnings and the images appear, served as AVIF/WebP from
      `/_next/image`.
- [ ] The favicon shows in the tab. It is a placeholder "B" mark (`src/app/icon.svg`); replace it
      with the estate's monogram when you have one.
- [ ] Lightbox: it fills the screen as the Safari toolbar shows and hides (`h-dvh`), and the page
      behind doesn't scroll.
- [ ] Lightbox: the prev/next bar stays at the bottom and its targets are easy to hit.
- [ ] Lightbox: swiping to scroll the details panel works.
- [ ] Tapping into the reprint fields doesn't zoom the page (inputs use a ≥ 16 px font).
- [ ] The email field shows the email keyboard.
- [ ] Rotating the phone while the lightbox is open keeps the layout sane.
- [ ] A hard refresh on `/is/works/brjost` shows the full page (no dialog). Back/forward through the
      lightbox history behaves as expected.
- [ ] The language toggle keeps the current filter query.
- [ ] VoiceOver: one pass of the gallery and the lightbox (see §2).

## 4. Real inquiry send

Use a Vercel Preview with real `RESEND_*` and `INQUIRY_TO_EMAIL` values. Use your own email address
as the sender so you can check `Reply-To`.

- [ ] `/is/works/upprisa` → **Kaupa eftirprent** → fill in all fields → submit. The thank-you
      message appears.
- [ ] The email arrives at `INQUIRY_TO_EMAIL` with the subject "Fyrirspurn um eftirprent · Reprint
      inquiry — ‹title› (ART-0003)". The title is the server's, even if you edited the hidden field
      in DevTools.
- [ ] Reply-To is the address you entered. The body shows the name, message and locale.
- [ ] The Resend dashboard shows the message as Delivered, with no bounce or spam flag.
- [ ] Repeat from `/en/works/brjost` in English. The email shows locale `en`.
- [ ] JavaScript disabled (Safari or Chrome settings): the CTA reveals the form, a valid submit
      sends exactly one email, and a localized success page renders.
- [ ] Honeypot: fill the hidden `company` field in DevTools and submit. The success message appears
      and **no** email arrives.
- [ ] Submitting within a couple of seconds of opening the form shows "Please wait a moment and
      try again.", and nothing is sent.

## 5. After launch

- [ ] PageSpeed Insights (mobile) on the production `/is`, `/en/about/press` and one work URL:
      record Perf, LCP and CLS, and compare with §0.
- [ ] Once there is CrUX field data (a few weeks of traffic): INP < 150 ms, LCP < 2.0 s, CLS < 0.02.
      Lighthouse can't measure INP, so this is the only check for it. `@vercel/speed-insights` is
      the optional alternative (Appendix B).
- [ ] Run the Schema Markup Validator (validator.schema.org) on the biography (`Person`) and a work
      page (`VisualArtwork`).
- [ ] Production response headers include CSP, HSTS, `X-Content-Type-Options` and
      `Referrer-Policy`, with no `X-Powered-By`.
