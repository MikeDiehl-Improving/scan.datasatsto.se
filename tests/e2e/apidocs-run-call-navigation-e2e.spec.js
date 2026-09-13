import { expect, test } from '@playwright/test';

/* treegress:obligation apidocs.navigatestatic.e2e-playwright.c2 do-not-regenerate — for: Verify clicking Run call for parameterless endpoint navigates browser directly to endpoint URL without populating inline textbox
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('navigates a parameterless endpoint', async ({ page }) => {
  await page.goto('/');
  const row = page.locator('tr[data-path="/expire"]');
  const inlineRequests = [];
  page.on('request', request => {
    if (['fetch', 'xhr'].includes(request.resourceType())) inlineRequests.push(request.url());
  });
  await expect(row.locator('.api-result')).toHaveText('');
  await row.getByRole('button', { name: 'Run call' }).click();
  await expect(page).toHaveURL(/\/expire$/);
  expect(inlineRequests).toHaveLength(0);
});

/* treegress:obligation apidocs.navigatewithparams.e2e-playwright.c2 do-not-regenerate — for: Verify entering a parameter and clicking Run call navigates browser to the parameterized URL
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('navigates to a parameterized endpoint', async ({ page }) => {
  await page.goto('/');
  const row = page.locator('tr[data-path="/report/:event"]');
  const inlineRequests = [];
  page.on('request', request => {
    if (['fetch', 'xhr'].includes(request.resourceType())) inlineRequests.push(request.url());
  });
  await row.getByLabel('Event').fill('101');
  await expect(row.locator('.api-result')).toHaveText('');
  await row.getByRole('button', { name: 'Run call' }).click();
  await expect(page).toHaveURL(/\/report\/101$/);
  expect(inlineRequests).toHaveLength(0);
});

/* treegress:obligation apidocs.navigatemultipleparams.e2e-playwright.c2 do-not-regenerate — for: Verify browser navigates to the composite URL containing multiple entered parameters upon clicking Run call
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('navigates to a composite parameterized endpoint', async ({ page }) => {
  await page.goto('/');
  const row = page.locator('tr[data-path="/random/:event/:vendorCode"]');
  const inlineRequests = [];
  page.on('request', request => {
    if (['fetch', 'xhr'].includes(request.resourceType())) inlineRequests.push(request.url());
  });
  await row.getByLabel('Event').fill('5');
  await row.getByLabel('Vendor code').fill('test');
  await expect(row.locator('.api-result')).toHaveText('');
  await row.getByRole('button', { name: 'Run call' }).click();
  await expect(page).toHaveURL(/\/random\/5\/test$/);
  expect(inlineRequests).toHaveLength(0);
});

/* treegress:obligation apidocs.navigateencodedparams.e2e-playwright.c2 do-not-regenerate — for: Verify browser navigates with encoded parameter values and does not render an inline response
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('encodes parameters in the navigated URL', async ({ page }) => {
  await page.goto('/');
  const row = page.locator('tr[data-path="/report/:event"]');
  const inlineRequests = [];
  page.on('request', request => {
    if (['fetch', 'xhr'].includes(request.resourceType())) inlineRequests.push(request.url());
  });
  await row.getByLabel('Event').fill('badge alpha/1');
  await expect(row.locator('.api-result')).toHaveText('');
  await row.getByRole('button', { name: 'Run call' }).click();
  await expect(page).toHaveURL(/\/report\/badge%20alpha%2F1$/);
  expect(inlineRequests).toHaveLength(0);
});

/* treegress:obligation apidocs.emptyparams.e2e-playwright.c2 do-not-regenerate — for: Verify omitted endpoint parameters do not trigger inline asynchronous fetching or response rendering
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('does not submit when a required parameter is empty', async ({ page }) => {
  await page.goto('/');
  const row = page.locator('tr[data-path="/report/:event"]');
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await row.getByRole('button', { name: 'Run call' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(row.locator('.api-result')).toHaveText('');
  expect(requests.filter(url => url.includes('/report/'))).toHaveLength(0);
});

/* treegress:obligation apidocs.everyendpointbutton.e2e-playwright.c2 do-not-regenerate — for: Verify every endpoint Run call button initiates browser navigation rather than inline fetching
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('uses navigation for endpoint buttons', async ({ page }) => {
  const endpoints = [
    ['/new/:event', { event: '5' }, /\/new\/5$/],
    ['/new/:event/:id', { event: '5', id: '101' }, /\/new\/5\/101$/],
    ['/setup', { vendorCode: 'test' }, /\/setup$/],
    ['/:id/:vendorCode', { id: '101', vendorCode: 'test' }, /\/101\/test$/],
    ['/:id', { id: '101' }, /\/setup\?id=101$/],
    ['/report/:event', { event: '5' }, /\/report\/5$/],
    ['/random/:event', { event: '5' }, /\/random\/5$/],
    ['/random/:event/:vendorCode', { event: '5', vendorCode: 'test' }, /\/random\/5\/test$/],
    ['/expire', {}, /\/expire$/]
  ];
  for (const [path, values, expectedUrl] of endpoints) {
    await page.goto('/');
    const row = path === '/setup'
      ? page.locator('tr[data-method="POST"][data-path="/setup"]')
      : page.locator(`tr[data-path="${path}"]`).first();
    for (const [name, value] of Object.entries(values)) {
      await row.locator(`[name="${name}"]`).fill(value);
    }
    await row.getByRole('button', { name: 'Run call' }).click();
    await expect(page).toHaveURL(expectedUrl);
  }
});
