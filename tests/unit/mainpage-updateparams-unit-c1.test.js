import { describe, it, expect } from 'vitest';
import { executeApiCall } from '../../assets/index.js';
import { TestFormData, row } from './mainpage-api-test-helpers.js';

describe('updated API parameters', () => {
    /* treegress:obligation mainpage.rerunwithnewparams.unit.c1 do-not-regenerate — for: Prove that updating parameter values and re-triggering the call produces an updated result reflecting the new inputs.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('runs with the updated value and displays the new result', async () => {
        const output = await executeApiCall(row('/report/:event'), new TestFormData({ event: 'updated456' }), async url => ({
            status: 200, statusText: 'OK', text: async () => `updated response from ${url}`
        }));
        expect(output).toContain('/report/updated456');
        expect(output).toContain('updated response');
    });
});
