import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { authorizeScanner } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('scanner setup form with an existing session vendor code', () => {
    /* treegress:obligation setup.get.prefilledform.unit.c1 do-not-regenerate — for: Verify scanner setup GET handler renders the setup page prefilled with previously submitted session vendor code
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('displays the scanner setup page prefilled with the previously submitted vendor code', async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent);
        await agent.post('/setup').send({ vendorCode: 'VENDOR99' });

        const res = await agent.get('/setup');

        expect(res.status).toBe(200);
        expect(res.text).toContain('value="VENDOR99"');
    });
});
