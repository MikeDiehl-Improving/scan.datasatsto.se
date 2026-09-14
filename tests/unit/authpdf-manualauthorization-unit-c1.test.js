import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

const scannerSecret = '00000000-0000-0000-0000-000000000001';

describe('authorization URL manual authorization', () => {
    beforeEach(() => resetTediousQueue());

    /* treegress:obligation authpdf.manualauthorization.unit.c1 do-not-regenerate — for: Verifies that navigating directly to the authorization URL authorizes the device and produces setup confirmation.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('authorizes a device and confirms scanner setup', async () => {
        const agent = request.agent(app);
        queueTediousRows([{ EventID: 7, Event: 'Test event', Expires: '2099-01-01' }]);
        const authorization = await agent.get(`/authorize/${scannerSecret}`);

        expect(authorization.status).toBe(200);
        expect(authorization.text).toContain('authorized');
        expect((await agent.get('/')).status).toBe(200);
    });
});
