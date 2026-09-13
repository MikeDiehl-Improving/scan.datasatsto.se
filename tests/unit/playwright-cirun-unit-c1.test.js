import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/* treegress:obligation playwright.cirun.unit.c1 do-not-regenerate — for: Verify the continuous integration workflow configuration installs Chromium dependencies and executes the e2e-playwright runner job.
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
describe('Playwright CI setup', () => {
  it('installs Chromium and runs the browser suite', () => {
    const workflow = readFileSync('.github/workflows/boss_dayofdatascanner.yml', 'utf8');

    expect(workflow).toContain('playwright install --with-deps chromium');
    expect(workflow).toContain('npm run test:e2e');
  });
});
