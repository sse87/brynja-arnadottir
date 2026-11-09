import { expect, test, type Page } from '@playwright/test';

/*
 * Phase 8 (SPEC Appendix A, §3.3): security headers, sitemap/robots reachability, and no
 * console errors or CSP violations on the main routes and interactions under the production CSP.
 */

const ALBUM = '2008-05-29-hafnarfjordur-100-ara';

/** Collects console errors, uncaught exceptions and CSP violation events for one page. */
async function watchForErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error(
        `CSP violation: ${e.violatedDirective} ${e.blockedURI} at ${e.sourceFile}:${e.lineNumber}:${e.columnNumber}`,
      );
    });
  });
  return errors;
}

/** Wait until every image has finished (or failed) loading, so blocked images would show up. */
async function settle(page: Page) {
  await page.waitForLoadState('load');
  await page.waitForFunction(() => [...document.images].every((img) => img.complete));
}

test('home page sends the security headers and no X-Powered-By', async ({ request }) => {
  const res = await request.get('/is', { maxRedirects: 0 });
  expect(res.status()).toBe(200);
  const h = res.headers();
  expect(h['content-security-policy']).toContain("default-src 'self'");
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['content-security-policy']).not.toContain('unsafe-eval');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
  expect(h['strict-transport-security']).toContain('max-age=63072000');
  expect(h['x-powered-by']).toBeUndefined();
});

test('press files are cached immutably', async ({ request }) => {
  const res = await request.get('/press/sample-1974-05-18.pdf');
  expect(res.status()).toBe(200);
  expect(res.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
});

for (const path of ['/sitemap.xml', '/robots.txt', '/og-default.jpg']) {
  test(`${path} is served without a locale redirect`, async ({ request }) => {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status()).toBe(200);
  });
}

test.describe('no console errors or CSP violations', () => {
  for (const path of [
    '/is',
    '/en',
    '/is?ink=bw',
    '/is/works/upprisa',
    '/en/about',
    '/is/about/exhibitions',
    '/en/about/albums',
    '/is/about/press',
  ]) {
    test(path, async ({ page }) => {
      const errors = await watchForErrors(page);
      await page.goto(path);
      await settle(page);
      expect(errors).toEqual([]);
    });
  }

  test('lightbox opened from the gallery, then the reprint form', async ({ page }) => {
    const errors = await watchForErrors(page);
    await page.goto('/is');
    await expect(page.locator('[role="status"]')).toBeVisible();
    await page.locator('[data-artwork-card="upprisa"] a').click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await dialog.locator('[aria-controls="reprint-inquiry"]').click();
    const form = dialog.locator('#reprint-inquiry form');
    await expect(form).toBeVisible();
    // Empty submit: client-side Zod validation runs (no email can be sent).
    await form.getByRole('button', { name: 'Senda fyrirspurn' }).click();
    await expect(form.locator('[aria-invalid="true"]').first()).toBeVisible();
    await settle(page);
    expect(errors).toEqual([]);
  });

  test('album photo dialog', async ({ page }) => {
    const errors = await watchForErrors(page);
    await page.goto(`/en/about/albums/${ALBUM}`);
    await page.locator(`[data-album-photo="${ALBUM}-01"]`).click();
    await expect(page.locator('dialog[open]')).toBeVisible();
    await settle(page);
    expect(errors).toEqual([]);
  });
});
