import { expect, test } from '@playwright/test';

async function openAvailableBadge(page) {
  await page.route('**/registration/status', async route => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'available' }) });
  });
  await page.goto('/assets/registration.html');
  await page.locator('#identity-id').fill('100');
  await page.getByRole('button', { name: 'Check badge' }).click();
  await expect(page.locator('#details')).toBeVisible();
}

test.describe('badge registration details', () => {
  /* treegress:obligation badgecheck.availableform.e2e-playwright.c2 do-not-regenerate — for: Detail form visibility and empty editable inputs in browser upon available badge check
     authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  test('shows empty details for an available badge', async ({ page }) => {
    await openAvailableBadge(page);
    await expect(page.locator('#details')).toBeVisible();
    await expect(await page.locator('#details input').evaluateAll(inputs => inputs.every(input => input.value === ''))).toBe(true);
  });

  /* treegress:obligation badgecheck.fullnamehidden.e2e-playwright.c2 do-not-regenerate — for: DOM visibility of full name input and editable first and last name inputs
     authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  test('hides full name and shows split name inputs', async ({ page }) => {
    await openAvailableBadge(page);
    await expect(page.getByLabel('Full name')).toHaveCount(0);
    await expect(page.getByLabel('First name')).toBeEditable();
    await expect(page.getByLabel('Last name')).toBeEditable();
  });

  /* treegress:obligation badgecheck.derivefullname.e2e-playwright.c2 do-not-regenerate — for: End-to-end detail form submission with derived full name and confirmation feedback
     authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  test('submits a derived full name and confirms registration', async ({ page }) => {
    let submittedName;
    await page.route('**/registration/claim', async route => {
      const body = JSON.parse(route.request().postData());
      submittedName = body.name;
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'registered' }) });
    });
    await openAvailableBadge(page);
    await page.getByLabel('Email').fill('jane@example.com');
    await page.getByLabel('First name').fill('Jane');
    await page.getByLabel('Last name').fill('Doe');
    await page.locator('#registration-form').evaluate(form => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await expect.poll(() => submittedName).toBe('Jane Doe');
    await expect(page.locator('#badge-status')).toHaveText('Badge registered successfully.');
  });

  /* treegress:obligation badgecheck.updatedlabels.e2e-playwright.c2 do-not-regenerate — for: User-visible label text for location address and role on badge detail form
     authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  test('shows the updated location and role labels', async ({ page }) => {
    await openAvailableBadge(page);
    await expect(page.getByLabel('Location/Address')).toBeVisible();
    await expect(page.getByLabel('Role (Volunteer/Organizer/Speaker)')).toBeVisible();
  });

  /* treegress:obligation badgecheck.webcampreserved.e2e-playwright.c2 do-not-regenerate — for: Webcam scanner integration and badge checking workflow progression in browser
     authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  test('keeps the webcam scanner control available', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) }
      });
      window.BarcodeDetector = class {
        constructor() {}
        async detect() {
          return [{ rawValue: '/100' }];
        }
      };
    });
    await page.route('**/registration/status', async route => {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'available' }) });
    });
    await page.goto('/assets/registration.html');
    await page.getByRole('button', { name: 'Scan with webcam' }).click();
    await expect(page.locator('#details')).toBeVisible();
  });

  /* treegress:obligation badgecheck.manualpreserved.e2e-playwright.c2 do-not-regenerate — for: Manual badge identifier input, submission, and subsequent workflow progression in browser
     authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  test('allows manual badge lookup to progress', async ({ page }) => {
    await openAvailableBadge(page);
    await expect(page.locator('#details')).toBeVisible();
  });

  /* treegress:obligation badgecheck.unavailablebadge.e2e-playwright.c2 do-not-regenerate — for: Display of unavailable badge message and absence of empty editable detail form
     authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  test('does not display details for an unavailable badge', async ({ page }) => {
    await page.route('**/registration/status', async route => {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'not-found' }) });
    });
    await page.goto('/assets/registration.html');
    await page.locator('#identity-id').fill('999');
    await page.getByRole('button', { name: 'Check badge' }).click();
    await expect(page.locator('#details')).toHaveAttribute('hidden', '');
    await expect(page.locator('#badge-status')).toHaveText('This badge was not found for the authorized event.');
  });

  /* treegress:obligation badgecheck.missingnames.e2e-playwright.c2 do-not-regenerate — for: Form submission prevention and display of required name field validation errors in browser
     authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
  test('requires first and last names before submission', async ({ page }) => {
    await openAvailableBadge(page);
    await page.getByLabel('Email').fill('jane@example.com');
    await expect(await page.locator('#registration-form').evaluate(form => form.checkValidity())).toBe(false);
    await expect(await page.getByLabel('First name').evaluate(input => input.validationMessage)).toMatch(/.+/);
    await expect(page.getByLabel('First name')).toHaveAttribute('required', '');
  });
});
