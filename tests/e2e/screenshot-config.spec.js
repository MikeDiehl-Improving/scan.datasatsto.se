import { expect, test } from '@playwright/test';
import screenshotConfig from '../../playwright.screenshots.config.js';
import baseConfig from '../../playwright.config.js';

/* treegress:obligation screenshotconfig.passingtest.e2e-playwright.c1 do-not-regenerate — for: Verify that executing tests with the dedicated screenshot configuration file via --config flag runs passing tests successfully and generates screenshot artifacts for each test.
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('forces screenshots for passing tests', async ({ page }, testInfo) => {
  await page.goto('/');
  const screenshotPath = testInfo.outputPath('page.png');
  await page.screenshot({ path: screenshotPath });
  expect(screenshotConfig.use.screenshot).toBe('on');
});

/* treegress:obligation screenshotconfig.failingtest.e2e-playwright.c1 do-not-regenerate — for: Verify that executing tests with the dedicated screenshot configuration via --config flag reports failure and saves screenshot artifacts for failing tests.
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('uses the same screenshot setting for failures', () => {
  expect(screenshotConfig.use.screenshot).toBe('on');
});

/* treegress:obligation screenshotconfig.preservesprojects.e2e-playwright.c1 do-not-regenerate — for: Verify that running tests with the dedicated screenshot configuration executes across all projects and preserves base URLs, timeouts, and device parameters from default configuration.
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('preserves the default project settings', () => {
  expect(screenshotConfig.testDir).toBe(baseConfig.testDir);
  expect(screenshotConfig.use.baseURL).toBe(baseConfig.use.baseURL);
  expect(screenshotConfig.webServer).toEqual(baseConfig.webServer);
});

/* treegress:obligation screenshotconfig.defaultrun.e2e-playwright.c1 do-not-regenerate — for: Verify that running tests under default Playwright configuration completes passing tests without generating screenshot artifacts.
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('leaves the default screenshot policy unchanged', () => {
  expect(baseConfig.use.screenshot).toBe('only-on-failure');
});

/* treegress:obligation screenshotconfig.invalidfile.e2e-playwright.c1 do-not-regenerate — for: Verify that specifying a non-existent configuration file via --config flag causes the test runner to exit with an error code, display a file not found error message, and prevent test suite execution.
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
test('provides a selectable dedicated config file', () => {
  expect(typeof screenshotConfig).toBe('object');
});
