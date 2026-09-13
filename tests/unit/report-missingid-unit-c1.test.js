import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

describe('report without an event identifier', () => {
    /* treegress:obligation report.missingid.unit.c1 do-not-regenerate — for: Verify request without an event identifier is rejected or redirected requiring a valid ID
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('requires an event identifier', async () => {
        const response = await request(app).get('/report');

        expect(response.status).toBeGreaterThanOrEqual(300);
        expect(response.text.toLowerCase()).toMatch(/report|not found|event/);
    });
});
