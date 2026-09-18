import { expect, test } from '@playwright/test';

test.describe('registration page layout', () => {
  /* treegress:obligation registration.desktoplayout.e2e-playwright.c1 do-not-regenerate — for: Proves that typography remains legible with proper proportions and form controls remain contained within their boundaries on desktop viewports without overflowing.
     authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  /* treegress:obligation registration.desktop.sizing.e2e-playwright.c1 do-not-regenerate — for: Verify on a desktop browser viewport that webcam scan controls, input fields, and submission buttons render with scaled typography and remain within container bounds without overflowing the screen.
     authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  test('keeps controls readable and contained on desktop', async ({ page }) => {
    await page.goto('/assets/registration.html');

    await expect(page.locator('body')).toHaveClass(/registration/);
    await expect(page.getByRole('button', { name: 'Scan with webcam' })).toBeVisible();
    await expect(page.getByLabel('Identity ID')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check badge' })).toBeVisible();

    const body = page.locator('body');
    expect(await body.evaluate(element => getComputedStyle(element).fontSize)).toBe('16px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
  });

  /* treegress:obligation registration.mobilelayout.e2e-playwright.c1 do-not-regenerate — for: Proves that typography scales without clipping and form controls fit within narrow mobile viewports without unintended horizontal scrolling.
     authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  /* treegress:obligation registration.mobile.sizing.e2e-playwright.c1 do-not-regenerate — for: Verify on a mobile viewport width that the registration controls, form inputs, and buttons adapt responsively without horizontal clipping or overflow.
     authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  test('keeps the manual form usable on a narrow viewport', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
    await page.goto('/assets/registration.html');

    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
    expect(await page.getByLabel('Identity ID').evaluate(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.right <= window.innerWidth;
    })).toBe(true);
    await page.close();
  });

  /* treegress:obligation registration.statusmessage.responsivelayout.e2e-playwright.c1 do-not-regenerate — for: Verify that rendered registration status feedback messages remain fully visible within layout bounds without horizontal overflow across desktop and mobile viewports.
     authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  test('keeps status messages within the responsive layout', async ({ browser }) => {
    for (const viewport of [{ width: 1280, height: 720 }, { width: 375, height: 667 }]) {
      const page = await browser.newPage({ viewport });
      await page.goto('/assets/registration.html');
      await page.locator('#badge-status').evaluate((element) => {
        element.textContent = 'This badge has already been registered.';
      });
      expect(await page.locator('#badge-status').evaluate(element => {
        const rect = element.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= window.innerWidth && rect.height > 0;
      })).toBe(true);
      await page.close();
    }
  });

  /* treegress:obligation registration.controls.mobileinteraction.e2e-playwright.c1 do-not-regenerate — for: Verify on mobile viewports that webcam controls respond without layout displacement and the manual input field receives focus without breaking the container layout.
     authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  test('keeps mobile controls interactive and contained', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/assets/registration.html');
    await page.getByRole('button', { name: 'Scan with webcam' }).click();
    await expect(page.locator('#camera-message')).toContainText('does not support webcam QR scanning');
    await page.getByLabel('Identity ID').focus();
    expect(await page.evaluate(() => document.activeElement.id)).toBe('identity-id');
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
  });
});
