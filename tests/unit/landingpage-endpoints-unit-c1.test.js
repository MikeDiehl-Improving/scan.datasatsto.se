import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { authorizeScanner } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('root landing page endpoint documentation', () => {
    /* treegress:obligation landingpage.endpoints.unit.c1 do-not-regenerate — for: Verify that the root landing page output includes documentation for /new/:event, /setup, /:id/:vendorCode, /report/:event, /random/:event, /pdf, and /expire endpoints.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('documents the /new/:event, /setup, /:id/:vendorCode, /report/:event, /random/:event, /pdf and /expire endpoints', async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent);
        const res = await agent.get('/');

        expect(res.text).toContain('/new/:event');
        expect(res.text).toContain('/setup');
        expect(res.text).toContain('/:id/:vendorCode');
        expect(res.text).toContain('/report/:event');
        expect(res.text).toContain('/random/:event');
        expect(res.text).toContain('href="/pdf"');
        expect(res.text).toContain('/expire');
    });
});
