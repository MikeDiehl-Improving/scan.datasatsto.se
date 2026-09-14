import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { authorizeScanner } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('scan request whose code segment contains "favicon"', () => {
    /* treegress:obligation scan.favicon.unit.c1 do-not-regenerate — for: Verify scan route short-circuits requests containing 'favicon' by responding with 404 and empty body
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('responds with 404 and an empty body', async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent);
        const res = await agent.get('/12345/favicon.ico');

        expect(res.status).toBe(404);
        expect(res.text).toBe('');
    });
});
