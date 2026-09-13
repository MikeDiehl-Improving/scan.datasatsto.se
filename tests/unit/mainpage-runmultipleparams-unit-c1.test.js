import { describe, it, expect } from 'vitest';
import { executeApiCall } from '../../assets/index.js';
import { TestFormData, row } from './mainpage-api-test-helpers.js';

describe('multiple-parameter API calls', () => {
    /* treegress:obligation mainpage.runmultipleparams.unit.c1 do-not-regenerate — for: Verify API call execution incorporating multiple supplied parameter values and display of the returned data
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('executes with all values and displays the result', async () => {
        const output = await executeApiCall(row('/random/:event/:vendorCode'), new TestFormData({ event: 'firstvalue', vendorCode: 'secondvalue' }), async url => ({
            status: 200, statusText: 'OK', text: async () => `combined result from ${url}`
        }));
        expect(output).toContain('/random/firstvalue/secondvalue');
        expect(output).toContain('combined result');
    });
});
