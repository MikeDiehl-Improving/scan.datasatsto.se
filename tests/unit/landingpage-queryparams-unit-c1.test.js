import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { authorizeScanner } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('root landing page with query parameters', () => {
    /* treegress:obligation landingpage.queryparams.unit.c1 do-not-regenerate — for: Verify that root path requests with query parameters successfully return the HTML API documentation landing page.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('returns the successful HTML landing page documenting the available API endpoints', async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent);
        const res = await agent.get('/?format=html');

        expect(res.status).toBeLessThan(400);
        expect(res.text).toContain('/new/:event');
    });
});
