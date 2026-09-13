import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

describe('welcome page stored procedure reference link', () => {
    /* treegress:obligation welcomepage.storedprocedureslink.unit.c1 do-not-regenerate — for: welcome page route and template render a navigable reference link to the stored procedures page
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('displays a navigable stored procedures reference link', async () => {
        const res = await request(app).get('/');

        expect(res.text).toMatch(/href="\/stored-procedures"/);
    });
});
