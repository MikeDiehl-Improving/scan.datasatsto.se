import { expect, test } from '@playwright/test';

test.describe('mobile browser rendering', () => {
  test('renders the authorization page without horizontal overflow', async ({ page }, testInfo) => {
    await page.goto('/assets/authorized.html');

    await expect(page.locator('body')).toHaveClass(/authorized/);
    await expect(page.getByText('This phone is authorized to scan badges for')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Choose the sponsor or Registration code' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => document.documentElement.clientWidth)
    );

    await page.screenshot({
      path: testInfo.outputPath(`${testInfo.project.name}-authorized.png`),
      fullPage: true
    });
  });

  test('renders both scan submit controls without overlap or clipping', async ({ page }, testInfo) => {
    await page.goto('/assets/scan.html');

    const controls = page.locator('.scan-actions input[type="submit"], .scan-actions button');
    await expect(controls).toHaveCount(2);
    await expect(controls.nth(0)).toBeVisible();
    await expect(controls.nth(1)).toBeVisible();

    const boxes = await controls.evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    }));
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(boxes.every(box => box.left >= 0 && box.right <= viewportWidth && box.bottom > box.top)).toBe(true);
    expect(
      boxes[0].right <= boxes[1].left ||
      boxes[1].right <= boxes[0].left ||
      boxes[0].bottom <= boxes[1].top ||
      boxes[1].bottom <= boxes[0].top
    ).toBe(true);

    await page.screenshot({
      path: testInfo.outputPath(`${testInfo.project.name}-scan.png`),
      fullPage: true
    });
  });
});
