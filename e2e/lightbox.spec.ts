import { expect, test, type Page } from '@playwright/test';

/*
 * SPEC §3.7 lightbox acceptance criteria. Fixture data (src/data/artworks.json):
 *   brjost  — colourful, reprint
 *   brynja  — black-and-white, no reprint
 *   upprisa — black-and-white, reprint
 */

const openDialog = (page: Page) => page.locator('dialog[open]');

/** Load the gallery and wait for the client Gallery to hydrate (its live count only exists then). */
async function gotoGallery(page: Page, query = '') {
  await page.goto(`/is${query}`);
  await expect(page.locator('[role="status"]')).toBeVisible();
}

async function openCard(page: Page, slug: string) {
  await page.locator(`[data-artwork-card="${slug}"] a`).click();
  await expect(openDialog(page)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/is/works/${slug}(\\?|$)`));
}

async function focusedCardSlug(page: Page) {
  return page.evaluate(
    () => document.activeElement?.closest<HTMLElement>('[data-artwork-card]')?.dataset.artworkCard,
  );
}

function slugFromUrl(page: Page) {
  return new URL(page.url()).pathname.split('/').pop();
}

async function pressAndWaitForUrlChange(page: Page, key: string) {
  const before = page.url();
  await page.keyboard.press(key);
  await expect.poll(() => page.url()).not.toBe(before);
}

/** A negative assertion: give the router a moment, then confirm nothing navigated. */
async function pressAndExpectNoNavigation(page: Page, key: string) {
  const before = page.url();
  await page.keyboard.press(key);
  await page.waitForTimeout(600);
  expect(page.url()).toBe(before);
}

test.describe('close: Esc, ✕ and backdrop all go back and restore focus', () => {
  const closers: Record<string, (page: Page) => Promise<void>> = {
    Esc: (page) => page.keyboard.press('Escape'),
    '✕ button': (page) => openDialog(page).getByRole('button', { name: 'Loka' }).click(),
    'backdrop (mat) click': (page) =>
      openDialog(page)
        .locator('[data-lightbox-backdrop]')
        .click({ position: { x: 8, y: 8 } }),
  };

  for (const [name, close] of Object.entries(closers)) {
    test(name, async ({ page }) => {
      await gotoGallery(page, '?ink=bw');
      await openCard(page, 'upprisa');
      await close(page);

      await expect(openDialog(page)).toHaveCount(0);
      await expect(page).toHaveURL(/\/is\?ink=bw$/);
      await expect.poll(() => focusedCardSlug(page)).toBe('upprisa');
    });
  }

  test('clicks on the image or the details panel do not close', async ({ page }) => {
    await gotoGallery(page);
    await openCard(page, 'brjost');
    await openDialog(page).locator('img').click();
    await openDialog(page)
      .locator('[data-details-panel]')
      .click({ position: { x: 20, y: 200 } });
    await expect(openDialog(page)).toBeVisible();
  });

  test('after prev/next, focus returns to the card of the work last shown', async ({ page }) => {
    await gotoGallery(page, '?ink=bw');
    await openCard(page, 'upprisa');
    await pressAndWaitForUrlChange(page, 'ArrowRight');
    const shown = slugFromUrl(page);
    await page.keyboard.press('Escape');
    await expect(openDialog(page)).toHaveCount(0);
    await expect.poll(() => focusedCardSlug(page)).toBe(shown);
  });

  test('activating Next from the keyboard keeps focus on Next (2.4.3)', async ({ page }) => {
    await gotoGallery(page);
    await openCard(page, 'brjost');
    await openDialog(page).locator('[data-nav="next"]').focus();
    const before = page.url();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.url()).not.toBe(before);
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-nav')))
      .toBe('next');
  });
});

test('html:has(dialog[open]) locks page scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await gotoGallery(page);
  const pageScrolls = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight,
  );
  expect(pageScrolls, 'gallery must be taller than the viewport for this test').toBe(true);

  await openCard(page, 'brjost');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
    'hidden',
  );
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.move(300, 300);
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);

  await page.keyboard.press('Escape');
  await expect(openDialog(page)).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe(
    'hidden',
  );
});

test('←/→ do nothing while focus is in the inquiry form', async ({ page }) => {
  await gotoGallery(page);
  await openCard(page, 'upprisa');
  await openDialog(page).locator('[aria-controls="reprint-inquiry"]').click();
  const panel = openDialog(page).locator('#reprint-inquiry');
  await expect(panel).toBeVisible();

  for (const name of ['name', 'email', 'message']) {
    await panel.locator(`[name="${name}"]`).focus();
    await pressAndExpectNoNavigation(page, 'ArrowRight');
    await pressAndExpectNoNavigation(page, 'ArrowLeft');
  }

  // Control: once focus leaves the field, arrows navigate again.
  await openDialog(page).getByRole('heading', { level: 1 }).click();
  await pressAndWaitForUrlChange(page, 'ArrowRight');
});

test.describe('prev/next respect the active filter combination', () => {
  const cases: { query: string; expected: string[] }[] = [
    { query: '', expected: ['brjost', 'brynja', 'upprisa'] },
    { query: '?ink=bw', expected: ['brynja', 'upprisa'] },
    { query: '?ink=color', expected: ['brjost'] },
    { query: '?reprints=1', expected: ['brjost', 'upprisa'] },
    { query: '?ink=bw&reprints=1', expected: ['upprisa'] },
    { query: '?ink=color&reprints=1', expected: ['brjost'] },
  ];

  for (const { query, expected } of cases) {
    test(`filters "${query || 'none'}" → ${expected.join(', ')}`, async ({ page }) => {
      await gotoGallery(page, query);
      const start = expected[0]!;
      await openCard(page, start);

      if (expected.length === 1) {
        await expect(openDialog(page).getByRole('link', { name: 'Næsta verk' })).toHaveCount(0);
        await pressAndExpectNoNavigation(page, 'ArrowRight');
        await pressAndExpectNoNavigation(page, 'ArrowLeft');
      } else {
        const seen = new Set<string>([start]);
        for (let i = 0; i < expected.length; i++) {
          await pressAndWaitForUrlChange(page, 'ArrowRight');
          seen.add(slugFromUrl(page)!);
          // Filters ride along in the URL.
          expect(new URL(page.url()).search).toBe(query);
        }
        expect([...seen].sort()).toEqual([...expected].sort());
        // Wrapped all the way round.
        expect(slugFromUrl(page)).toBe(start);

        // Buttons use the same list: ← goes back one.
        await openDialog(page).getByRole('link', { name: 'Fyrra verk' }).click();
        await expect.poll(() => slugFromUrl(page)).toBe(expected.at(-1));
      }

      // router.replace adds no history entries: one Back closes to the filtered gallery.
      await page.keyboard.press('Escape');
      await expect(openDialog(page)).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`/is${query.replace('?', '\\?')}$`));
    });
  }
});

test.describe('lightbox image never upscales and never crops', () => {
  for (const viewport of [
    { width: 2560, height: 1440 },
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    test(`${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await gotoGallery(page);
      for (const slug of ['brjost', 'brynja', 'upprisa']) {
        await page.goto(`/is`);
        await expect(page.locator('[role="status"]')).toBeVisible();
        await openCard(page, slug);
        const image = openDialog(page).locator('img');
        // w-auto/h-auto: the box only has a size once the image has decoded.
        await expect
          .poll(
            () => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
            {
              message: `${slug} image loads`,
              timeout: 15_000,
            },
          )
          .toBe(true);
        const m = await image.evaluate((img: HTMLImageElement) => {
          const r = img.getBoundingClientRect();
          const pane = img.parentElement!.getBoundingClientRect();
          return {
            objectFit: getComputedStyle(img).objectFit,
            w: r.width,
            h: r.height,
            attrW: Number(img.getAttribute('width')),
            attrH: Number(img.getAttribute('height')),
            inPane:
              r.left >= pane.left - 0.5 &&
              r.right <= pane.right + 0.5 &&
              r.top >= pane.top - 0.5 &&
              r.bottom <= pane.bottom + 0.5,
          };
        });
        expect(m.objectFit, slug).toBe('contain');
        expect(m.w, slug).toBeLessThanOrEqual(m.attrW);
        expect(m.h, slug).toBeLessThanOrEqual(m.attrH);
        // Box keeps the intrinsic aspect ratio (so object-contain has nothing to letterbox or crop).
        expect(Math.abs(m.w / m.h - m.attrW / m.attrH) / (m.attrW / m.attrH), slug).toBeLessThan(
          0.01,
        );
        expect(m.inPane, `${slug} fits its pane`).toBe(true);
      }
    });
  }
});

test.describe('hard load renders the full page, not the modal', () => {
  async function expectFullPage(page: Page, slug: string) {
    await expect(page.locator('dialog')).toHaveCount(0);
    await expect(page.locator('main article').getByRole('link', { name: /Verk/ })).toHaveAttribute(
      'href',
      '/is',
    );
    await expect(page.locator('main h1#artwork-title')).toBeVisible();
    const ld = await page.locator('script[type="application/ld+json"]').textContent();
    expect(JSON.parse(ld!)['@type']).toBe('VisualArtwork');
    await expect(page).toHaveURL(new RegExp(`/is/works/${slug}`));
  }

  test('direct load / shared link', async ({ page }) => {
    await page.goto('/is/works/upprisa');
    await expectFullPage(page, 'upprisa');
  });

  test('refresh while the lightbox is open', async ({ page }) => {
    await gotoGallery(page, '?ink=bw');
    await openCard(page, 'upprisa');
    await page.reload();
    await expectFullPage(page, 'upprisa');
  });

  test('"Open as page" link leaves the modal for the full page', async ({ page }) => {
    await gotoGallery(page);
    await openCard(page, 'brynja');
    // sr-only until focused: a keyboard affordance, so drive it with the keyboard.
    await openDialog(page).getByRole('link', { name: 'Opna sem síðu' }).focus();
    await page.keyboard.press('Enter');
    await expectFullPage(page, 'brynja');
  });

  test('server HTML of a work URL contains no dialog', async ({ request }) => {
    const html = await (await request.get('/is/works/brjost')).text();
    expect(html).not.toContain('<dialog');
    expect(html).toContain('"@type":"VisualArtwork"');
  });

  test('unknown slug → localized 404', async ({ page }) => {
    const res = await page.goto('/is/works/does-not-exist');
    expect(res?.status()).toBe(404);
  });
});
