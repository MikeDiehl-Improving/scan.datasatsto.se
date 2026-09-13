import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('random scan lookup without reference code', () => {
    beforeEach(() => {
        resetTediousQueue();
    });

    /* treegress:obligation randomscan.withoutcode.unit.c1 do-not-regenerate — for: Verify random scans endpoint returns 200 and a JSON array of scan records when called with only an event secret
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('returns a successful response with the scan records formatted as a JSON array', async () => {
        queueTediousRows([
            { ID: 1, ReferenceCode: 'vendor123' },
            { ID: 2, ReferenceCode: 'vendor456' },
        ]);

        const res = await request(app).get('/random/validsecret');

        expect(res.ok).toBe(true);
        expect(res.body).toEqual([
            { ID: 1, ReferenceCode: 'vendor123' },
            { ID: 2, ReferenceCode: 'vendor456' },
        ]);
    });
});
