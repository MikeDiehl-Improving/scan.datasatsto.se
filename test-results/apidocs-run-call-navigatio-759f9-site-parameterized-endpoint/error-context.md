# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apidocs-run-call-navigation-e2e.spec.js >> navigates to a composite parameterized endpoint
- Location: tests\e2e\apidocs-run-call-navigation-e2e.spec.js:36:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('tr[data-path="/random/:event/:vendorCode"]').getByLabel('Event')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]: Scan the event organizer's authorization QR code on this phone first.
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | 
  3   | /* treegress:obligation apidocs.navigatestatic.e2e-playwright.c2 do-not-regenerate — for: Verify clicking Run call for parameterless endpoint navigates browser directly to endpoint URL without populating inline textbox
  4   |    authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  5   | test('navigates a parameterless endpoint', async ({ page }) => {
  6   |   await page.goto('/');
  7   |   const row = page.locator('tr[data-path="/expire"]');
  8   |   const inlineRequests = [];
  9   |   page.on('request', request => {
  10  |     if (['fetch', 'xhr'].includes(request.resourceType())) inlineRequests.push(request.url());
  11  |   });
  12  |   await expect(row.locator('.api-result')).toHaveText('');
  13  |   await row.getByRole('button', { name: 'Run call' }).click();
  14  |   await expect(page).toHaveURL(/\/expire$/);
  15  |   expect(inlineRequests).toHaveLength(0);
  16  | });
  17  | 
  18  | /* treegress:obligation apidocs.navigatewithparams.e2e-playwright.c2 do-not-regenerate — for: Verify entering a parameter and clicking Run call navigates browser to the parameterized URL
  19  |    authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  20  | test('navigates to a parameterized endpoint', async ({ page }) => {
  21  |   await page.goto('/');
  22  |   const row = page.locator('tr[data-path="/report/:event"]');
  23  |   const inlineRequests = [];
  24  |   page.on('request', request => {
  25  |     if (['fetch', 'xhr'].includes(request.resourceType())) inlineRequests.push(request.url());
  26  |   });
  27  |   await row.getByLabel('Event').fill('101');
  28  |   await expect(row.locator('.api-result')).toHaveText('');
  29  |   await row.getByRole('button', { name: 'Run call' }).click();
  30  |   await expect(page).toHaveURL(/\/report\/101$/);
  31  |   expect(inlineRequests).toHaveLength(0);
  32  | });
  33  | 
  34  | /* treegress:obligation apidocs.navigatemultipleparams.e2e-playwright.c2 do-not-regenerate — for: Verify browser navigates to the composite URL containing multiple entered parameters upon clicking Run call
  35  |    authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  36  | test('navigates to a composite parameterized endpoint', async ({ page }) => {
  37  |   await page.goto('/');
  38  |   const row = page.locator('tr[data-path="/random/:event/:vendorCode"]');
  39  |   const inlineRequests = [];
  40  |   page.on('request', request => {
  41  |     if (['fetch', 'xhr'].includes(request.resourceType())) inlineRequests.push(request.url());
  42  |   });
> 43  |   await row.getByLabel('Event').fill('5');
      |                                 ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  44  |   await row.getByLabel('Vendor code').fill('test');
  45  |   await expect(row.locator('.api-result')).toHaveText('');
  46  |   await row.getByRole('button', { name: 'Run call' }).click();
  47  |   await expect(page).toHaveURL(/\/random\/5\/test$/);
  48  |   expect(inlineRequests).toHaveLength(0);
  49  | });
  50  | 
  51  | /* treegress:obligation apidocs.navigateencodedparams.e2e-playwright.c2 do-not-regenerate — for: Verify browser navigates with encoded parameter values and does not render an inline response
  52  |    authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  53  | test('encodes parameters in the navigated URL', async ({ page }) => {
  54  |   await page.goto('/');
  55  |   const row = page.locator('tr[data-path="/report/:event"]');
  56  |   const inlineRequests = [];
  57  |   page.on('request', request => {
  58  |     if (['fetch', 'xhr'].includes(request.resourceType())) inlineRequests.push(request.url());
  59  |   });
  60  |   await row.getByLabel('Event').fill('badge alpha/1');
  61  |   await expect(row.locator('.api-result')).toHaveText('');
  62  |   await row.getByRole('button', { name: 'Run call' }).click();
  63  |   await expect(page).toHaveURL(/\/report\/badge%20alpha%2F1$/);
  64  |   expect(inlineRequests).toHaveLength(0);
  65  | });
  66  | 
  67  | /* treegress:obligation apidocs.emptyparams.e2e-playwright.c2 do-not-regenerate — for: Verify omitted endpoint parameters do not trigger inline asynchronous fetching or response rendering
  68  |    authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  69  | test('does not submit when a required parameter is empty', async ({ page }) => {
  70  |   await page.goto('/');
  71  |   const row = page.locator('tr[data-path="/report/:event"]');
  72  |   const requests = [];
  73  |   page.on('request', request => requests.push(request.url()));
  74  |   await row.getByRole('button', { name: 'Run call' }).click();
  75  |   await expect(page).toHaveURL(/\/$/);
  76  |   await expect(row.locator('.api-result')).toHaveText('');
  77  |   expect(requests.filter(url => url.includes('/report/'))).toHaveLength(0);
  78  | });
  79  | 
  80  | /* treegress:obligation apidocs.everyendpointbutton.e2e-playwright.c2 do-not-regenerate — for: Verify every endpoint Run call button initiates browser navigation rather than inline fetching
  81  |    authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  82  | test('uses navigation for endpoint buttons', async ({ page }) => {
  83  |   const endpoints = [
  84  |     ['/new/:event', { event: '5' }, /\/new\/5$/],
  85  |     ['/new/:event/:id', { event: '5', id: '101' }, /\/new\/5\/101$/],
  86  |     ['/setup', { vendorCode: 'test' }, /\/setup$/],
  87  |     ['/:id/:vendorCode', { id: '101', vendorCode: 'test' }, /\/101\/test$/],
  88  |     ['/:id', { id: '101' }, /\/setup\?id=101$/],
  89  |     ['/report/:event', { event: '5' }, /\/report\/5$/],
  90  |     ['/random/:event', { event: '5' }, /\/random\/5$/],
  91  |     ['/random/:event/:vendorCode', { event: '5', vendorCode: 'test' }, /\/random\/5\/test$/],
  92  |     ['/expire', {}, /\/expire$/]
  93  |   ];
  94  |   for (const [path, values, expectedUrl] of endpoints) {
  95  |     await page.goto('/');
  96  |     const row = path === '/setup'
  97  |       ? page.locator('tr[data-method="POST"][data-path="/setup"]')
  98  |       : page.locator(`tr[data-path="${path}"]`).first();
  99  |     for (const [name, value] of Object.entries(values)) {
  100 |       await row.locator(`[name="${name}"]`).fill(value);
  101 |     }
  102 |     await row.getByRole('button', { name: 'Run call' }).click();
  103 |     await expect(page).toHaveURL(expectedUrl);
  104 |   }
  105 | });
  106 | 
```