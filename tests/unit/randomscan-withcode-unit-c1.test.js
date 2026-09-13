import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('random scan lookup with reference code', () => {
    beforeEach(() => {
        resetTediousQueue();
    });

    /* treegress:obligation randomscan.withcode.unit.c1 do-not-regenerate — for: Verify random scans endpoint returns 200 and matching scan records as a JSON array when called with both event secret and reference code filter
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('returns a successful response with the matching scan records formatted as a JSON array', async () => {
        queueTediousRows([
            { ID: 3, ReferenceCode: 'vendor123' },
        ]);

        const res = await request(app).get('/random/validsecret/vendor123');

        expect(res.ok).toBe(true);
        expect(res.body).toEqual([
            { ID: 3, ReferenceCode: 'vendor123' },
        ]);
    });
});
