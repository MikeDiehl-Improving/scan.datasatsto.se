import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('report event isolation', () => {
    beforeEach(() => resetTediousQueue());

    /* treegress:obligation report.eventisolation.unit.c1 do-not-regenerate — for: Verify report data is strictly isolated to the specified event and excludes scans belonging to other events
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('returns only scans supplied for the requested event', async () => {
        queueTediousRows([{ Event: 'EVENTA', ID: 1, ReferenceCode: 'A1' }]);

        const response = await request(app).get('/report/EVENTA');

        expect(response.body).toEqual([{ Event: 'EVENTA', ID: 1, ReferenceCode: 'A1' }]);
        expect(response.body).not.toContainEqual(expect.objectContaining({ Event: 'EVENTB' }));
    });
});
