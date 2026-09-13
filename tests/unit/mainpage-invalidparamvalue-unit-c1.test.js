import { describe, it, expect } from 'vitest';
import { buildApiRequest, formatApiError } from '../../assets/index.js';
import { TestFormData, row } from './mainpage-api-test-helpers.js';

describe('invalid API parameter values', () => {
    /* treegress:obligation mainpage.invalidparamvalue.unit.c1 do-not-regenerate — for: Prove that providing an invalid parameter format displays an error message or validation indicator alerting the user.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('displays an invalid input indication', () => {
        let error;
        try {
            buildApiRequest(row('/:id'), new TestFormData({ id: 'not-a-number' }));
        } catch (caught) {
            error = caught;
        }
        expect(formatApiError(error)).toContain('id must be a number');
    });
});
