import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

describe('stored procedures database details', () => {
    /* treegress:obligation storedprocedures.serveranddatabaseinfo.unit.c1 do-not-regenerate — for: stored procedures view renders configured database server name, database name, and reference details
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('renders configured database connection details with the reference', async () => {
        const previousServer = process.env.dbserver;
        const previousDatabase = process.env.dbname;
        process.env.dbserver = 'reference-test-server';
        process.env.dbname = 'reference-test-database';

        try {
            const res = await request(app).get('/stored-procedures');

            expect(res.text).toContain('reference-test-server');
            expect(res.text).toContain('reference-test-database');
            expect(res.text).toContain('Scan.New_Event');
        } finally {
            if (previousServer === undefined) delete process.env.dbserver;
            else process.env.dbserver = previousServer;
            if (previousDatabase === undefined) delete process.env.dbname;
            else process.env.dbname = previousDatabase;
        }
    });
});
