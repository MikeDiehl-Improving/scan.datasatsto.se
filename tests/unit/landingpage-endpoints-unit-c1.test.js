import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

describe('root landing page endpoint documentation', () => {
    /* treegress:obligation landingpage.endpoints.unit.c1 do-not-regenerate — for: Verify that the root landing page output includes documentation for /new/:event, /setup, /:id/:code, /report/:secret, /random/:secret, /pdf/:secret, and /expire endpoints.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('documents the /new/:event, /setup, /:id/:code, /report/:secret, /random/:secret, /pdf/:secret and /expire endpoints', async () => {
        const res = await request(app).get('/');

        expect(res.text).toContain('/new/:event');
        expect(res.text).toContain('/setup');
        expect(res.text).toContain('/:id/:code');
        expect(res.text).toContain('/report/:secret');
        expect(res.text).toContain('/random/:secret');
        expect(res.text).toContain('/pdf/:secret');
        expect(res.text).toContain('/expire');
    });
});
