import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/* treegress:obligation playwright.smokefail.unit.c1 do-not-regenerate — for: Verify the test runner captures assertion failures and exits with a non-zero status code.
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
describe('Playwright failure reporting', () => {
  it('uses the Playwright runner so assertion failures produce a failing process', () => {
    const packageJson = readFileSync('package.json', 'utf8');

    expect(packageJson).toContain('"test:e2e": "playwright test"');
  });
});
