import { describe, it, expect } from 'vitest';
import { executeApiCall } from '../../assets/index.js';
import { TestFormData, row } from './mainpage-api-test-helpers.js';

describe('single-parameter API calls', () => {
    /* treegress:obligation mainpage.runsingleparam.unit.c1 do-not-regenerate — for: Verify API call execution using a user-supplied parameter value and rendering of the resulting output
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('executes with the supplied value and returns output', async () => {
        const output = await executeApiCall(row('/report/:secret'), new TestFormData({ secret: 'val123' }), async url => ({
            status: 200, statusText: 'OK', text: async () => `response from ${url}`
        }));
        expect(output).toContain('/report/val123');
        expect(output).toContain('response from');
    });
});
