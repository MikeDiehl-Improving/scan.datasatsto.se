import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousError, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('random scan lookup with reference code when the SQL statement fails', () => {
    beforeEach(() => {
        resetTediousQueue();
    });

    /* treegress:obligation randomscan.errorwithcode.unit.c1 do-not-regenerate — for: Verify random scans endpoint returns HTTP 200 and an empty response body when the SQL statement fails during lookup with reference code
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('returns an HTTP 200 response with an empty body', async () => {
        queueTediousError(new Error('simulated statement failure'));

        const res = await request(app).get('/random/validsecret/vendor123');

        expect(res.status).toBe(200);
        expect(res.text).toBe('');
    });
});
