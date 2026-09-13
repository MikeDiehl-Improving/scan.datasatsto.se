import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('report with recorded scans', () => {
    beforeEach(() => resetTediousQueue());

    /* treegress:obligation report.validwithscans.unit.c1 do-not-regenerate — for: Verify scan report generation returns document containing all recorded badge scan details for an event
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('returns a report containing every recorded scan detail', async () => {
        queueTediousRows([
            { ID: 1, ReferenceCode: 'BADGE1', Note: 'First scan' },
            { ID: 2, ReferenceCode: 'BADGE2', Note: 'Second scan' },
        ]);

        const response = await request(app).get('/report/EVENT123');

        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            { ID: 1, ReferenceCode: 'BADGE1', Note: 'First scan' },
            { ID: 2, ReferenceCode: 'BADGE2', Note: 'Second scan' },
        ]);
    });
});
