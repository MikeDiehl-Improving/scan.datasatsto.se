import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('scan request with an explicit vendor code segment', () => {
    beforeEach(() => {
        resetTediousQueue();
    });

    /* treegress:obligation scan.explicitcode.unit.c1 do-not-regenerate — for: Verify scan with explicit vendor code renders confirmation and stores code in session for subsequent requests
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('shows the confirmation page and reuses the code on a later session request', async () => {
        const agent = request.agent(app);

        queueTediousRows([{ ID: 1 }]);
        const first = await agent.get('/12345/EXHIBIT100');

        expect(first.status).toBe(200);
        expect(first.text).toContain('EXHIBIT100');

        queueTediousRows([{ ID: 2 }]);
        const second = await agent.get('/67890');

        expect(second.status).toBe(200);
        expect(second.text).toContain('EXHIBIT100');
    });
});
