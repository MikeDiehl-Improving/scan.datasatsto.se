import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('random scan lookup with no matching records', () => {
    beforeEach(() => {
        resetTediousQueue();
    });

    /* treegress:obligation randomscan.emptyrecordset.unit.c1 do-not-regenerate — for: Verify random scans endpoint returns 200 and an empty JSON array when no records match the event secret
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('returns a successful response with an empty JSON array', async () => {
        queueTediousRows([]);

        const res = await request(app).get('/random/validsecret');

        expect(res.ok).toBe(true);
        expect(res.body).toEqual([]);
    });
});
