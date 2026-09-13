import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/* treegress:obligation playwright.appstartupfailure.unit.c1 do-not-regenerate — for: Verify the runner detects when the web server fails to start or times out and terminates with an appropriate error.
   authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
describe('Playwright application startup', () => {
  it('configures a readiness URL and startup timeout', () => {
    const treegressConfig = JSON.parse(readFileSync('.treegress/config.json', 'utf8'));
    const playwrightConfig = readFileSync('playwright.config.js', 'utf8');

    expect(treegressConfig.webServer.url).toBe('http://localhost:3000');
    expect(treegressConfig.webServer.timeoutMs).toBe(60000);
    expect(playwrightConfig).toContain("url: 'http://localhost:3000'");
  });
});
