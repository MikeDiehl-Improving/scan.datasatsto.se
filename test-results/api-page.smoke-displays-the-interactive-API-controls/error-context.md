# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api-page.smoke.spec.js >> displays the interactive API controls
- Location: tests\e2e\api-page.smoke.spec.js:5:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'scan.datasatsto.se' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'scan.datasatsto.se' }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'scan.datasatsto.se' })

```

```yaml
- text: Scan the event organizer's authorization QR code on this phone first.
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | /* treegress:obligation playwright.smokepass.e2e-playwright.c1 do-not-regenerate — for: Launch Chromium and navigate to the application entry point to verify the page loads and renders successfully in an end-to-end smoke test.
  4  |    authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  5  | test('displays the interactive API controls', async ({ page }) => {
  6  |   await page.goto('/');
  7  | 
> 8  |   await expect(page.getByRole('heading', { name: 'scan.datasatsto.se' })).toBeVisible();
     |                                                                           ^ Error: expect(locator).toBeVisible() failed
  9  | 
  10 |   const newEventRow = page.locator('tr[data-path="/new/:event"]');
  11 |   await expect(newEventRow.getByLabel('Event')).toBeVisible();
  12 |   await expect(newEventRow.getByRole('button', { name: 'Run call' })).toBeVisible();
  13 | });
  14 | 
```