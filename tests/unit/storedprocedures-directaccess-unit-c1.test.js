import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

describe('direct stored procedures reference access', () => {
    /* treegress:obligation storedprocedures.directaccess.unit.c1 do-not-regenerate — for: direct GET request to stored procedures endpoint responds successfully with database connection info
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('loads successfully and presents database connection information', async () => {
        const previousServer = process.env.dbserver;
        const previousDatabase = process.env.dbname;
        process.env.dbserver = 'direct-test-server';
        process.env.dbname = 'direct-test-database';

        try {
            const res = await request(app).get('/stored-procedures');

            expect(res.ok).toBe(true);
            expect(res.text).toContain('direct-test-server');
            expect(res.text).toContain('direct-test-database');
        } finally {
            if (previousServer === undefined) delete process.env.dbserver;
            else process.env.dbserver = previousServer;
            if (previousDatabase === undefined) delete process.env.dbname;
            else process.env.dbname = previousDatabase;
        }
    });
});
