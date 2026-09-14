import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { authorizeScanner, queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('scan request whose query returns zero matching records', () => {
    beforeEach(() => {
        resetTediousQueue();
    });

    /* treegress:obligation scan.mismatchedrecord.unit.c1 do-not-regenerate — for: Verify scan error page and message "That code didn't look right." when query returns zero records
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it("shows an error page with the message That code didn't look right.", async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent);
        queueTediousRows([]);

        const res = await agent.get('/12345/UNKNOWN99');

        expect(res.status).toBe(500);
        expect(res.text).toContain("That code didn't look right.");
    });
});
