import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

describe('report malformed identifiers', () => {
    /* treegress:obligation report.malformedid.unit.c1 do-not-regenerate — for: Verify malformed identifiers and traversal attempts are rejected without exposing system resources
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('rejects traversal identifiers without exposing a file or system resource', async () => {
        const response = await request(app).get('/report/%2e%2e%2finvalid');

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.text).not.toContain('package.json');
        expect(response.text).not.toContain('server.js');
    });
});
