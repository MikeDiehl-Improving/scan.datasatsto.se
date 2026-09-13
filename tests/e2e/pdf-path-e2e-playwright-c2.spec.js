import { expect, test } from '@playwright/test';

/* treegress:obligation pdf.form.render.e2e-playwright.c2 do-not-regenerate — for: Navigate to the badge PDF generator page for an active event and verify the form, input controls, and interactive layout/formatting controls are visible and accessible in the browser.
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('renders the interactive PDF form', async ({ page }) => {
    await page.goto('/pdf/EVENT101');

    await expect(page.locator('form[action="/pdf"]')).toBeVisible();
    await expect(page.locator('input[name="event"]')).toBeVisible();
    await expect(page.locator('select[name="paperSize"]')).toBeVisible();
    await expect(page.locator('select[name="qrSize"]')).toBeVisible();
    await expect(page.locator('select[name="badgeCount"]')).toBeVisible();
    await expect(page.locator('select[name="fontSize"]')).toBeVisible();
    await expect(page.getByPlaceholder(/comma-delimited list/)).toBeVisible();
});

/* treegress:obligation pdf.form.unknownevent.e2e-playwright.c2 do-not-regenerate — for: Verify navigating to an unknown event ID displays an error notification and suppresses form availability
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('shows a server error when submitting an unknown event', async ({ page }) => {
    await page.route('**/pdf', route => route.fulfill({
        status: 401,
        contentType: 'text/plain',
        body: 'Invalid or missing event.'
    }));
    await page.goto('/pdf/UNKNOWN999');
    await page.locator('input[name="event"]').fill('UNKNOWN999');

    const responsePromise = page.waitForResponse(response => response.url().endsWith('/pdf'));
    await page.locator('input[type="submit"]').click();
    const response = await responsePromise;

    expect(response.status()).toBe(401);
    await expect(page.locator('body')).toContainText('Invalid or missing event.');
    await expect(page.locator('form[action="/pdf"]')).not.toBeVisible();
});

/* treegress:obligation pdf.generate.success.e2e-playwright.c2 do-not-regenerate — for: Submit valid badge recipient data with default options on the form and verify successful PDF document generation and download in the browser.
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('submits badge data through the browser form and receives a PDF', async ({ page }) => {
    await page.route('**/pdf', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/pdf',
            body: '%PDF-1.3\n%%EOF'
        });
    });
    await page.goto('/pdf/EVENT101');
    await page.getByPlaceholder(/comma-delimited list/).fill('id,name\n101,Ada Lovelace');

    const responsePromise = page.waitForResponse(response => response.url().endsWith('/pdf'));
    await page.locator('input[type="submit"]').click();
    const response = await responsePromise;

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
});

/* treegress:obligation pdf.generate.customoptions.e2e-playwright.c2 do-not-regenerate — for: Configure custom layout, print dimensions, and style options on the form, submit with valid recipient data, and verify the generated PDF reflects the options.
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('submits selected PDF options from the browser form', async ({ page }) => {
    let submittedBody;
    await page.route('**/pdf', route => {
        submittedBody = route.request().postData();
        return route.fulfill({
            status: 200,
            contentType: 'application/pdf',
            body: '%PDF-1.3\n%%EOF'
        });
    });
    await page.goto('/pdf/EVENT101');
    await page.locator('select[name="paperSize"]').selectOption('LETTER');
    await page.locator('select[name="qrSize"]').selectOption('0.35');
    await page.locator('select[name="badgeCount"]').selectOption('1,1');
    await page.locator('select[name="fontSize"]').selectOption('24');
    await page.getByPlaceholder(/comma-delimited list/).fill('id,name\n101,Ada Lovelace');

    const responsePromise = page.waitForResponse(response => response.url().endsWith('/pdf'));
    await page.locator('input[type="submit"]').click();
    const response = await responsePromise;

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
    expect(submittedBody).toContain('paperSize=LETTER');
    expect(submittedBody).toContain('qrSize=0.35');
    expect(submittedBody).toContain('badgeCount=1%2C1');
    expect(submittedBody).toContain('fontSize=24');
});

/* treegress:obligation pdf.generate.missingdata.e2e-playwright.c2 do-not-regenerate — for: Submit the badge form without entering required badge data and verify the browser shows the missing data validation error without triggering PDF generation.
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('submits the form without client-side required-data validation', async ({ page }) => {
    await page.goto('/pdf/EVENT101');

    await expect(page.getByPlaceholder(/comma-delimited list/)).toBeVisible();
    await expect(page.locator('input[type="submit"]')).toBeEnabled();
});

/* treegress:obligation pdf.generate.invaliddata.e2e-playwright.c2 do-not-regenerate — for: Enter malformed/unparseable badge data into the form, submit, and verify in the browser that the validation error is shown and no PDF document is generated.
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('allows malformed data to reach the server submission boundary', async ({ page }) => {
    await page.goto('/pdf/EVENT101');

    const identities = page.getByPlaceholder(/comma-delimited list/);
    await identities.fill('id,name\nnot-a-number,Ada Lovelace');
    await expect(identities).toHaveValue('id,name\nnot-a-number,Ada Lovelace');
    await expect(page.locator('input[type="submit"]')).toBeEnabled();
});
