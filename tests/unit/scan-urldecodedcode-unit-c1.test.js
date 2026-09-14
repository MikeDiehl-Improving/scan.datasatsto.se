import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { authorizeScanner, queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('scan request with a URL-encoded vendor code segment', () => {
    beforeEach(() => {
        resetTediousQueue();
    });

    /* treegress:obligation scan.urldecodedcode.unit.c1 do-not-regenerate — for: Verify URL-encoded vendor code segment is correctly decoded and rendered in confirmation page
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('shows the confirmation page with the decoded vendor code', async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent);
        queueTediousRows([{ ID: 1 }]);

        const res = await agent.get('/12345/EXHIBITOR%20ONE');

        expect(res.status).toBe(200);
        expect(res.text).toContain('EXHIBITOR ONE');
    });
});
