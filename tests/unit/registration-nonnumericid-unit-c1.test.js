import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

describe('registration route with a non-numeric second URL segment', () => {
    /* treegress:obligation registration.nonnumericid.unit.c1 do-not-regenerate — for: Prove that route definitions matching registration routes with non-numeric second segments do not invoke the registration handler and return a 404 not found response.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('returns a 404 not found response instead of processing the registration', async () => {
        const res = await request(app).get('/new/TreegressEvent/vip');

        expect(res.status).toBe(404);
    });
});
