# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: playwright-runnerexecution-e2e-playwright-c1.spec.js >> runs the browser suite against the started application
- Location: tests\e2e\playwright-runnerexecution-e2e-playwright-c1.spec.js:5:5

# Error details

```
Error: expect(page).toHaveTitle(expected) failed

Expected: "scan.datasatsto.se API"
Received: "An error occurred"
Timeout:  5000ms

Call log:
  - Expect "toHaveTitle" with timeout 5000ms
    13 × locator resolved to <html>…</html>
       - unexpected value "An error occurred"

```

```yaml
- text: Scan the event organizer's authorization QR code on this phone first.
```

# Test source

```ts
  1 | import { expect, test } from '@playwright/test';
  2 | 
  3 | /* treegress:obligation playwright.runnerexecution.e2e-playwright.c1 do-not-regenerate — for: Verify that invoking the e2e-playwright runner automatically starts the application server and executes the browser test suite against the active application.
  4 |    authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  5 | test('runs the browser suite against the started application', async ({ page }) => {
  6 |   await page.goto('/');
> 7 |   await expect(page).toHaveTitle('scan.datasatsto.se API');
    |                      ^ Error: expect(page).toHaveTitle(expected) failed
  8 | });
  9 | 
```