import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

describe('stored procedures missing database details', () => {
    /* treegress:obligation storedprocedures.unconfiguredserverdetails.unit.c1 do-not-regenerate — for: stored procedures endpoint presents fallback notification and back link when connection configuration is missing
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('shows a friendly unavailable-details notice and welcome link', async () => {
        const previousServer = process.env.dbserver;
        const previousDatabase = process.env.dbname;
        delete process.env.dbserver;
        delete process.env.dbname;

        try {
            const res = await request(app).get('/stored-procedures');

            expect(res.text).toContain('Database connection details are unavailable.');
            expect(res.text).toMatch(/href="\/"/);
        } finally {
            if (previousServer === undefined) delete process.env.dbserver;
            else process.env.dbserver = previousServer;
            if (previousDatabase === undefined) delete process.env.dbname;
            else process.env.dbname = previousDatabase;
        }
    });
});
