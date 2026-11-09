import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * SPEC Appendix B (WCAG 2.2 AA) checks that a test can make reliably. The rest (screen reader
 * output, real-device behaviour) is in docs/QA-CHECKLIST.md.
 */

async function expectTarget44(target: Locator) {
  const box = await target.boundingBox();
  expect(box, 'element is rendered').not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

async function openLightbox(page: Page, slug: string) {
  await page.goto('/is');
  await expect(page.locator('[role="status"]')).toBeVisible(); // Gallery hydrated
  await page.locator(`[data-artwork-card="${slug}"] a`).click();
  const dialog = page.locator('dialog[open]');
  await expect(dialog).toBeVisible();
  return dialog;
}

for (const [locale, target, visible] of [
  ['is', 'en', 'English'],
  ['en', 'is', 'Íslenska'],
] as const) {
  test(`/${locale}: language toggle has lang="${target}" and its name starts with "${visible}" (2.5.3)`, async ({
    page,
  }) => {
    await page.goto(`/${locale}`);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    const toggle = page.locator(`header a[hreflang="${target}"]`);
    await expect(toggle).toHaveAttribute('lang', target);
    await expect(toggle).toHaveText(visible);
    await expect(toggle).toHaveAccessibleName(new RegExp(`^${visible}`));
  });
}

test('icon-only controls are at least 44×44 px', async ({ page }) => {
  await page.goto('/is');
  await expectTarget44(page.locator('footer a[href*="facebook.com"]'));

  const dialog = await openLightbox(page, 'brjost');
  await expectTarget44(dialog.getByRole('button', { name: 'Loka' }));
  await expectTarget44(dialog.locator('[data-nav="prev"]'));
  await expectTarget44(dialog.locator('[data-nav="next"]'));
});

test('lightbox is labelled by the artwork title', async ({ page }) => {
  const dialog = await openLightbox(page, 'brjost');
  const title = await dialog.locator('h1').innerText();
  await expect(dialog).toHaveAccessibleName(title);
});

test('focus ring in the lightbox details panel uses --focus, not the mat ink', async ({ page }) => {
  const dialog = await openLightbox(page, 'brjost'); // colour work → dark mat, near-white mat ink
  const cta = dialog.locator('[aria-controls="reprint-inquiry"]');
  await cta.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab'); // keyboard focus → :focus-visible
  await expect(cta).toBeFocused();
  const [outline, focus] = await cta.evaluate((el) => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--focus)';
    el.parentElement!.append(probe);
    const result = [getComputedStyle(el).outlineColor, getComputedStyle(probe).color];
    probe.remove();
    return result;
  });
  expect(outline).toBe(focus);
});

test('inquiry fields are marked required and keep a visible focus ring when invalid', async ({
  page,
}) => {
  const dialog = await openLightbox(page, 'upprisa');
  await dialog.locator('[aria-controls="reprint-inquiry"]').click();
  const form = dialog.locator('#reprint-inquiry');
  for (const name of ['name', 'email', 'message']) {
    await expect(form.locator(`[name="${name}"]`)).toHaveAttribute('aria-required', 'true');
  }
  await form.getByRole('button', { name: 'Senda fyrirspurn' }).click();
  const name = form.locator('[name="name"]');
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  // Focus moved by script after a keyboard-less click still matches :focus, not always
  // :focus-visible; tab away and back so the check is about the keyboard ring.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(name).toBeFocused();
  expect(await name.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
});

test('/en press: link name keeps the Icelandic headline in a lang="is" span', async ({ page }) => {
  await page.goto('/en/about/press');
  const link = page.locator('[data-press] a[target="_blank"]').first();
  await expect(link).not.toHaveAttribute('aria-label', /.*/);
  await expect(link).toHaveAccessibleName(/^Open clipping: .+ \(opens in a new tab\)$/);
  await expect(link.locator('span[lang="is"]')).toHaveCount(1);
});
