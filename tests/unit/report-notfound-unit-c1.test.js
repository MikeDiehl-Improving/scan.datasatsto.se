import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('report for an unknown event', () => {
    beforeEach(() => resetTediousQueue());

    /* treegress:obligation report.notfound.unit.c1 do-not-regenerate — for: Verify request for non-existent event report rejects with a not found indication
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('rejects an event that has no report', async () => {
        queueTediousRows([]);

        const response = await request(app).get('/report/NONEXISTENT999');

        expect(response.status).toBe(404);
        expect(response.text.toLowerCase()).toMatch(/not found|report/);
    });
});
