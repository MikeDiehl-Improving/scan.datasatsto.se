import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

const scannerSecret = '00000000-0000-0000-0000-000000000001';

describe('expired authorization URL', () => {
    beforeEach(() => resetTediousQueue());

    /* treegress:obligation authpdf.expiredurl.unit.c1 do-not-regenerate — for: Verifies that navigating to an expired or revoked authorization URL denies authorization and displays an expired link error.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('denies authorization and displays an expired link error', async () => {
        const agent = request.agent(app);
        queueTediousRows([]);
        const authorization = await agent.get(`/authorize/${scannerSecret}`);

        expect(authorization.status).toBe(403);
        expect(authorization.text).toContain('invalid or expired');
        expect((await agent.get('/')).status).toBe(403);
    });
});
