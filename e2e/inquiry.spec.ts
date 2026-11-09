import { expect, test } from '@playwright/test';

/*
 * SPEC §4.6 reprint inquiry. None of these tests can send email: they stop at server-side
 * validation or take the honeypot path (fake success, Resend never called).
 * Fixture: upprisa (ART-0003) is available as a reprint.
 */

const CTA = '[aria-controls="reprint-inquiry"]';
const SECTION = '#reprint-inquiry';

test.describe('with JavaScript', () => {
  test('lightbox: open, server validation, values kept, Back refocuses the CTA', async ({
    page,
  }) => {
    await page.goto('/is');
    await expect(page.locator('[role="status"]')).toBeVisible(); // Gallery hydrated
    await page.locator('[data-artwork-card="upprisa"] a').click();
    const dialog = page.locator('dialog[open]');
    await dialog.locator(CTA).click();

    const form = dialog.locator(SECTION);
    await expect(form.getByRole('heading', { name: 'Fyrirspurn um eftirprent' })).toBeFocused();
    expect(new URL(page.url()).hash).toBe(''); // JS opened it, not `:target`

    await form.locator('[name="name"]').fill('Guðrún');
    await form.getByRole('button', { name: 'Senda fyrirspurn' }).click();

    // First invalid field is focused, messages are in the page locale, input survives the reset.
    await expect(form.locator('[name="email"]')).toBeFocused();
    await expect(form.getByText('Vinsamlegast sláðu inn netfang.')).toBeVisible();
    await expect(form.getByText('Vinsamlegast skrifaðu skilaboð.')).toBeVisible();
    await expect(form.locator('[name="name"]')).toHaveValue('Guðrún');

    await form.getByRole('link', { name: 'Til baka' }).click();
    await expect(dialog.locator(CTA)).toBeFocused();
    await expect(form).toBeHidden();
    await expect(dialog).toBeVisible(); // Back did not navigate away
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('CTA reveals the form; a POST round-trip renders localized field errors', async ({
    page,
  }) => {
    await page.goto('/en/works/upprisa');
    const form = page.locator(SECTION);
    await expect(form).toBeHidden();

    await page.locator(CTA).click();
    await expect(form).toBeVisible(); // via :target
    await expect(page.locator(CTA)).toBeHidden();

    await form.locator('[name="name"]').fill('Guðrún');
    await form.locator('[name="email"]').fill('not-an-email');
    await form.getByRole('button', { name: 'Send inquiry' }).click();
    await page.waitForLoadState();

    await expect(form).toBeVisible();
    await expect(form.getByText("That email address doesn't look valid.")).toBeVisible();
    await expect(form.getByText('Please write a message.')).toBeVisible();
    await expect(form.locator('[name="name"]')).toHaveValue('Guðrún');
    await expect(form.locator('[name="email"]')).toHaveValue('not-an-email');
    await expect(page.locator(CTA)).toHaveCount(0);

    // Back is a plain link to the work page: a fresh GET shows the CTA again.
    await form.getByRole('link', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/en\/works\/upprisa$/);
    await expect(page.locator(CTA)).toBeVisible();
    await expect(page.locator(SECTION)).toBeHidden();
  });

  test('honeypot submission renders the success panel and sends nothing', async ({ page }) => {
    await page.goto('/is/works/upprisa');
    await page.locator(CTA).click();
    const form = page.locator(SECTION);
    await form.locator('[name="name"]').fill('Bot');
    await form.locator('[name="email"]').fill('bot@example.com');
    await form.locator('[name="message"]').fill('Buy cheap things now please.');
    await form.locator('[name="company"]').fill('Acme', { force: true });
    await form.getByRole('button', { name: 'Senda fyrirspurn' }).click();
    await page.waitForLoadState();

    await expect(form.getByRole('status')).toContainText('Takk fyrir!');
  });
});
