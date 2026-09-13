import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('report for an event without scans', () => {
    beforeEach(() => resetTediousQueue());

    /* treegress:obligation report.emptyevent.unit.c1 do-not-regenerate — for: Verify report document indicates no scan records are present when an event has zero scans
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('returns an empty report when the event has no scans', async () => {
        queueTediousRows([{ message: 'No scan records are present.' }]);

        const response = await request(app).get('/report/EVENTEMPTY');

        expect(response.status).toBe(200);
        expect(response.body).toEqual([{ message: 'No scan records are present.' }]);
    });
});
