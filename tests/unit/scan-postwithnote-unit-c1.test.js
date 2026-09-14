import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { authorizeScanner, queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('POST scan request with a vendor code and an optional note', () => {
    beforeEach(() => {
        resetTediousQueue();
    });

    /* treegress:obligation scan.postwithnote.unit.c1 do-not-regenerate — for: Verify POST scan request with vendor code and optional note renders confirmation page
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('shows the confirmation page displaying the vendor code', async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent);
        queueTediousRows([{ ID: 1 }]);

        const res = await agent
            .post('/12345/EXHIBIT200')
            .send({ note: 'Follow up regarding quote' });

        expect(res.status).toBe(200);
        expect(res.text).toContain('EXHIBIT200');
    });

    it('accepts an ID-only POST using the vendor code from the session', async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent);
        await agent.post('/setup').send({ vendorCode: 'EXHIBIT200' });
        queueTediousRows([{ ID: 1 }]);
        const res = await agent
            .post('/12345')
            .send({ note: 'Follow up regarding quote' });

        expect(res.status).toBe(200);
        expect(res.text).toContain('EXHIBIT200');
    });
});
