import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { authorizeScanner } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('scanner setup form with no prior session vendor code', () => {
    /* treegress:obligation setup.get.blankform.unit.c1 do-not-regenerate — for: Verify scanner setup GET handler renders the setup page with an empty vendor code input when no session code exists
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('displays the scanner setup page with an empty vendor code input', async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent);
        const res = await agent.get('/setup');

        expect(res.status).toBe(200);
        expect(res.text).toContain('name="vendorCode"');
        expect(res.text).toContain('value=""');
    });
});
