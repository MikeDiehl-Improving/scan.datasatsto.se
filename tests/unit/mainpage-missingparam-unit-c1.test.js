import { describe, it, expect } from 'vitest';
import { buildApiRequest, formatApiError } from '../../assets/index.js';
import { TestFormData, row } from './mainpage-api-test-helpers.js';

describe('missing API parameters', () => {
    /* treegress:obligation mainpage.missingrequiredparam.unit.c1 do-not-regenerate — for: Prove that omitting a required parameter triggers a validation error message and halts successful execution.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('displays a required indication and prevents execution', () => {
        let error;
        try {
            buildApiRequest(row('/report/:secret'), new TestFormData({ secret: '' }));
        } catch (caught) {
            error = caught;
        }
        expect(formatApiError(error)).toContain('secret is required');
        expect(() => buildApiRequest(row('/report/:secret'), new TestFormData({ secret: '' }))).toThrow();
        expect(formatApiError(error)).not.toContain('200 OK');
    });
});
