import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

describe('stored procedures reference navigation', () => {
    /* treegress:obligation storedprocedures.navigatedfromwelcome.unit.c1 do-not-regenerate — for: stored procedures reference endpoint returns 200 and renders procedure documentation
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('displays the stored procedures reference page', async () => {
        const res = await request(app).get('/stored-procedures');

        expect(res.ok).toBe(true);
        expect(res.text).toContain('Scan.New_Identity');
    });
});
