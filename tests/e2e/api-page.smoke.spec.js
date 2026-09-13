import { expect, test } from '@playwright/test';

/* treegress:obligation playwright.smokepass.e2e-playwright.c1 do-not-regenerate — for: Launch Chromium and navigate to the application entry point to verify the page loads and renders successfully in an end-to-end smoke test.
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('displays the interactive API controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'scan.datasatsto.se' })).toBeVisible();

  const newEventRow = page.locator('tr[data-path="/new/:event"]');
  await expect(newEventRow.getByLabel('Event')).toBeVisible();
  await expect(newEventRow.getByRole('button', { name: 'Run call' })).toBeVisible();
});
