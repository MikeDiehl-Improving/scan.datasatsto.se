import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('scanner setup with an identifier that has no matching reference codes', () => {
    beforeEach(() => {
        resetTediousQueue();
    });

    /* treegress:obligation setup.get.nocodes.unit.c1 do-not-regenerate — for: Verify scanner setup GET handler with non-matching identifier renders error page with 'That code didn't look right.'
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it("displays an error page with the message That code didn't look right.", async () => {
        queueTediousRows([]);

        const res = await request(app).get('/setup?id=999');

        expect(res.status).toBe(500);
        expect(res.text).toContain("That code didn't look right.");
    });
});
