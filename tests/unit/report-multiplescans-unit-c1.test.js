import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('report scan ordering', () => {
    beforeEach(() => resetTediousQueue());

    /* treegress:obligation report.multiplescans.unit.c1 do-not-regenerate — for: Verify report preserves all scan entries and their sequential or chronological ordering
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('preserves every scan in recorded order', async () => {
        const scans = [
            { ID: 1, ReferenceCode: 'FIRST' },
            { ID: 2, ReferenceCode: 'SECOND' },
            { ID: 3, ReferenceCode: 'THIRD' },
        ];
        queueTediousRows(scans);

        const response = await request(app).get('/report/EVENTMULTI');

        expect(response.body).toEqual(scans);
        expect(response.body.map((scan) => scan.ID)).toEqual([1, 2, 3]);
    });
});
