import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { authorizeScanner } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('root landing page', () => {
    /* treegress:obligation landingpage.view.unit.c1 do-not-regenerate — for: Verify that the root path request handler returns a successful status and HTML landing page containing introductory API documentation instead of the 'Nothing to see here' error message.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('returns a successful HTML landing page instead of a not found error', async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent);
        const res = await agent.get('/');

        expect(res.status).toBeLessThan(400);
        expect(res.text).not.toContain('Nothing to see here');
        expect(res.text).toMatch(/API/i);
    });
});
