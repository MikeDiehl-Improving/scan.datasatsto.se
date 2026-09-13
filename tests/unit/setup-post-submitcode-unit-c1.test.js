import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

describe('scanner setup vendor code submission', () => {
    /* treegress:obligation setup.post.submitcode.unit.c1 do-not-regenerate — for: Verify scanner setup POST handler persists vendor code into session and renders confirmation view
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('shows a confirmation page with the submitted code and retains it in the session', async () => {
        const agent = request.agent(app);

        const postRes = await agent.post('/setup').send({ code: 'VENDOR99' });

        expect(postRes.status).toBe(200);
        expect(postRes.text).toContain('VENDOR99');

        const followUp = await agent.get('/setup');

        expect(followUp.text).toContain('value="VENDOR99"');
    });
});
