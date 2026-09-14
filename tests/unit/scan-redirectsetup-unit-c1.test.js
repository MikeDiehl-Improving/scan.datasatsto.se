import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { authorizeScanner } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('scan request with no code and no session vendor code', () => {
    /* treegress:obligation scan.redirectsetup.unit.c1 do-not-regenerate — for: Verify scan requests lacking vendor code and active session redirect to /setup with badge id parameter
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('redirects to /setup with the badge id parameter', async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent);
        const res = await agent.get('/12345');

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/setup?id=12345');
    });
});
