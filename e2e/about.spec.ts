import { expect, test, type Page } from '@playwright/test';

/*
 * Phase 7 acceptance (SPEC §5, Appendix C): sorting and date formatting in both locales,
 * archival photos never upscaled, press file links name the right type and size.
 * Fixture data: src/data/about/*.json (sample content).
 */

const ALBUM = 'sample-opening-2008';

const copy = {
  is: {
    nav: {
      biography: 'Æviágrip',
      exhibitions: 'Sýningar',
      albums: 'Myndaalbúm',
      press: 'Fjölmiðlar',
    },
    born: '1942',
    exhibitionDates: ['15. mars 1968 – 30. mars 1968', '29. maí 2008 – 15. júní 2008'],
    decades: ['1960–1969', '2000–2009'],
    albumMeta: '29. maí 2008 · 1 mynd',
    photoOf: '1 af 1',
    close: 'Loka',
    pressDates: ['nóvember 1991', '18. maí 1974'],
    pressFiles: ['Mynd · 12,7 kB', 'PDF · 0,7 kB'],
    pressLabels: [
      'Opna úrklippu: [Sýnishorn] Teiknarinn (Mynd, 12,7 kB) (opnast í nýjum flipa)',
      'Opna úrklippu: [Sýnishorn] Línan sem lifir (PDF, 0,7 kB) (opnast í nýjum flipa)',
    ],
    notFound: 'Síða fannst ekki',
  },
  en: {
    nav: {
      biography: 'Biography',
      exhibitions: 'Exhibitions',
      albums: 'Photo albums',
      press: 'Press',
    },
    born: '1942',
    exhibitionDates: ['15 March 1968 – 30 March 1968', '29 May 2008 – 15 June 2008'],
    decades: ['1960–1969', '2000–2009'],
    albumMeta: '29 May 2008 · 1 photo',
    photoOf: '1 of 1',
    close: 'Close',
    pressDates: ['November 1991', '18 May 1974'],
    pressFiles: ['Image · 12.7 kB', 'PDF · 0.7 kB'],
    pressLabels: [
      'Open clipping: [Sýnishorn] Teiknarinn (Image, 12.7 kB) (opens in a new tab)',
      'Open clipping: [Sýnishorn] Línan sem lifir (PDF, 0.7 kB) (opens in a new tab)',
    ],
    notFound: 'Page not found',
  },
} as const;

// By accessible name: the header's language toggle also links to …/about/press.
const aboutNav = (page: Page, locale: 'is' | 'en') =>
  page.getByRole('navigation', {
    name: locale === 'is' ? 'Kaflar um listamanninn' : 'About sections',
  });

/** Every image on the page (or in `scope`) renders no larger than its declared intrinsic size. */
async function expectNoUpscaling(page: Page, scope = 'main') {
  const sizes = await page.locator(`${scope} img`).evaluateAll((imgs) =>
    imgs.map((img) => {
      const r = img.getBoundingClientRect();
      return {
        src: img.getAttribute('src'),
        rendered: [r.width, r.height],
        declared: [Number(img.getAttribute('width')), Number(img.getAttribute('height'))],
      };
    }),
  );
  expect(sizes.length).toBeGreaterThan(0);
  // Half a pixel for sub-pixel layout rounding of the aspect-ratio-derived dimension.
  const EPSILON = 0.5;
  for (const { src, rendered, declared } of sizes) {
    expect(rendered[0], `${src} width`).toBeLessThanOrEqual(declared[0]! + EPSILON);
    expect(rendered[1], `${src} height`).toBeLessThanOrEqual(declared[1]! + EPSILON);
  }
}

for (const locale of ['is', 'en'] as const) {
  const t = copy[locale];

  test.describe(`/${locale}/about`, () => {
    test('AboutNav marks the current section, incl. album detail → albums', async ({ page }) => {
      const cases = [
        [`/${locale}/about`, t.nav.biography],
        [`/${locale}/about/exhibitions`, t.nav.exhibitions],
        [`/${locale}/about/albums`, t.nav.albums],
        [`/${locale}/about/albums/${ALBUM}`, t.nav.albums],
        [`/${locale}/about/press`, t.nav.press],
      ] as const;
      for (const [path, label] of cases) {
        await page.goto(path);
        const current = aboutNav(page, locale).locator('[aria-current="page"]');
        await expect(current, path).toHaveCount(1);
        await expect(current, path).toHaveText(label);
      }
    });

    test('biography: lifespan and year-only born/died dates', async ({ page }) => {
      await page.goto(`/${locale}/about`);
      await expect(page.getByText('1942–2025')).toBeVisible();
      const times = page.locator('main dl time');
      await expect(times).toHaveCount(2);
      await expect(times.nth(0)).toHaveAttribute('datetime', '1942');
      await expect(times.nth(0)).toHaveText(t.born);
      await expect(times.nth(1)).toHaveText('2025');
      const jsonLd = JSON.parse(
        (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
      );
      expect(jsonLd).toMatchObject({ '@type': 'Person', birthDate: '1942', deathDate: '2025' });
    });

    test('exhibitions: ascending, grouped by decade, localized ranges', async ({ page }) => {
      await page.goto(`/${locale}/about/exhibitions`);
      await expect(page.locator('main section h2')).toHaveText([...t.decades]);
      await expect(page.locator('[data-exhibition]')).toHaveCount(2);
      const ids = await page
        .locator('[data-exhibition]')
        .evaluateAll((els) => els.map((e) => e.id));
      expect(ids).toEqual(['EXH-1968-01', 'EXH-2008-01']);
      await expect(page.locator('[data-exhibition] > p:first-child')).toHaveText([
        ...t.exhibitionDates,
      ]);
      await expect(page.locator('[data-exhibition="EXH-1968-01"] time').first()).toHaveAttribute(
        'datetime',
        '1968-03-15',
      );

      await page.locator('[data-exhibition="EXH-2008-01"] a').click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/about/albums/${ALBUM}$`));
    });

    test('albums: index card shows date + photo count; back-link to exhibition anchor', async ({
      page,
    }) => {
      await page.goto(`/${locale}/about/albums`);
      await expect(page.locator(`[data-album="${ALBUM}"] p`)).toHaveText(t.albumMeta);

      await page.locator(`[data-album="${ALBUM}"] a`).click();
      await expect(page).toHaveURL(new RegExp(`/about/albums/${ALBUM}$`));
      await page.locator('[data-exhibition-link]').click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/about/exhibitions#EXH-2008-01$`));
      await expect(page.locator('#EXH-2008-01')).toBeInViewport();
    });

    test('album dialog: opens, counts, arrows are harmless at the ends, Esc restores focus', async ({
      page,
    }) => {
      await page.goto(`/${locale}/about/albums/${ALBUM}`);
      const thumb = page.locator('[data-album-photo="p01"]');
      await thumb.click();
      const dialog = page.locator('dialog[open]');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(t.photoOf)).toBeVisible();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowLeft');
      await expect(dialog.getByText(t.photoOf)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(thumb).toBeFocused();

      await thumb.click();
      await page.locator('dialog[open]').getByRole('button', { name: t.close }).click();
      await expect(page.locator('dialog[open]')).toHaveCount(0);
    });

    test('unknown album → localized 404', async ({ page }) => {
      const res = await page.goto(`/${locale}/about/albums/does-not-exist`);
      expect(res?.status()).toBe(404);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(t.notFound);
    });

    test('press: newest first, localized dates, type + size in link name', async ({ page }) => {
      await page.goto(`/${locale}/about/press`);
      const rows = page.locator('[data-press]');
      await expect(rows).toHaveCount(2);
      await expect(rows.locator(':scope > time')).toHaveText([...t.pressDates]);
      await expect(rows.locator('[data-press-file]')).toHaveText([...t.pressFiles]);
      const links = rows.locator('a[target="_blank"]');
      await expect(links.nth(0)).toHaveAccessibleName(t.pressLabels[0]);
      await expect(links.nth(1)).toHaveAccessibleName(t.pressLabels[1]);
      await expect(links.nth(0)).toHaveAttribute('href', '/press/sample-1991-11.jpg');
      await expect(rows.first().locator('[lang="is"]').first()).toHaveText(
        '[Sýnishorn] Teiknarinn',
      );

      const translation = page.getByText('[Sample] The Draughtsman');
      if (locale === 'en') await expect(translation).toHaveAttribute('lang', 'en');
      else await expect(translation).toHaveCount(0);
    });

    test('footer: exactly one social link, Facebook', async ({ page }) => {
      for (const path of ['/about', '/about/press']) {
        await page.goto(`/${locale}${path}`);
        await expect(page.locator('a[href*="facebook.com"]')).toHaveCount(1);
        await expect(page.locator('body > footer a')).toHaveCount(1);
      }
    });
  });
}

test.describe('archival photos are never upscaled', () => {
  test.use({ viewport: { width: 2560, height: 1440 } });

  for (const path of [
    '/is/about',
    '/is/about/albums',
    `/is/about/albums/${ALBUM}`,
    '/en/about/press',
  ]) {
    test(path, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('load');
      await expectNoUpscaling(page);
    });
  }

  test('album dialog image is capped at the intrinsic width', async ({ page }) => {
    await page.goto(`/is/about/albums/${ALBUM}`);
    await page.locator('[data-album-photo="p01"]').click();
    const img = page.locator('dialog[open] img');
    await expect(img).toBeVisible();
    await expect(img).toHaveCSS('max-width', '2592px');
    await expect(img).toHaveAttribute('sizes', '(min-width: 2592px) 2592px, 100vw');
    await expectNoUpscaling(page, 'dialog[open]');
  });
});
