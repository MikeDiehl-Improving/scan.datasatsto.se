import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

describe('unrecognized route', () => {
    /* treegress:obligation landingpage.unknownroute.unit.c1 do-not-regenerate — for: Verify that requesting an unrecognized path returns a not found indication and does not render the API documentation landing page.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('returns a not found indication and does not render the API documentation landing page', async () => {
        const res = await request(app).get('/nonexistent');

        expect(res.status).toBe(404);
        expect(res.text).not.toContain('scan.datasatsto.se API');
    });
});
