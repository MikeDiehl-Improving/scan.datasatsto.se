import { expect, test } from '@playwright/test';

/* treegress:obligation playwright.runnerexecution.e2e-playwright.c1 do-not-regenerate — for: Verify that invoking the e2e-playwright runner automatically starts the application server and executes the browser test suite against the active application.
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('runs the browser suite against the started application', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('scan.datasatsto.se API');
});
