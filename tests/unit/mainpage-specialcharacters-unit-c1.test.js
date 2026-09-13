import { describe, it, expect } from 'vitest';
import { executeApiCall } from '../../assets/index.js';
import { TestFormData, row } from './mainpage-api-test-helpers.js';

describe('special-character API parameters', () => {
    /* treegress:obligation mainpage.specialcharacters.unit.c1 do-not-regenerate — for: Verify parameter handling, encoding, and response display when parameter values contain special characters or spaces
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('encodes the value and displays the response', async () => {
        const output = await executeApiCall(row('/report/:secret'), new TestFormData({ secret: 'item 123-test' }), async url => ({
            status: 200, statusText: 'OK', text: async () => `response from ${url}`
        }));
        expect(output).toContain('/report/item%20123-test');
        expect(output).toContain('response from');
    });
});
