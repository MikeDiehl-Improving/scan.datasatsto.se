import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { authorizeScanner, queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('scan request reusing a vendor code established via /setup', () => {
    beforeEach(() => {
        resetTediousQueue();
    });

    /* treegress:obligation scan.sessionsetup.unit.c1 do-not-regenerate — for: Verify scan without explicit code succeeds by reusing vendor code saved in session from setup
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('shows the confirmation page displaying the setup-established vendor code', async () => {
        const agent = request.agent(app);

        await authorizeScanner(agent);
        await agent.post('/setup').send({ vendorCode: 'BOOTH77' });

        queueTediousRows([{ ID: 1 }]);
        const res = await agent.get('/12345');

        expect(res.status).toBe(200);
        expect(res.text).toContain('BOOTH77');
    });

    it('uses a submitted vendor code without changing the default unless requested', async () => {
        const agent = request.agent(app);

        await authorizeScanner(agent);
        await agent.post('/setup').send({ vendorCode: 'BOOTH77' });

        queueTediousRows([{ ID: 1 }]);
        const res = await agent
            .post('/12345')
            .send({ vendorCode: 'BOOTH88', note: '' });

        expect(res.status).toBe(200);
        expect(res.text).toContain('BOOTH88');

        const followUp = await agent.get('/12345');
        expect(followUp.text).toContain('value="BOOTH77"');
    });

    it('updates the default when the submitted vendor code is selected as default', async () => {
        const agent = request.agent(app);

        await authorizeScanner(agent);
        await agent.post('/setup').send({ vendorCode: 'BOOTH77' });

        queueTediousRows([{ ID: 1 }]);
        await agent
            .post('/12345')
            .send({ vendorCode: 'BOOTH88', setDefault: 'on', note: '' });

        const followUp = await agent.get('/12345');
        expect(followUp.text).toContain('value="BOOTH88"');
    });
});
