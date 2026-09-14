import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('invalid authorization PDF request', () => {
    beforeEach(() => resetTediousQueue());

    /* treegress:obligation authpdf.invalidrequest.unit.c1 do-not-regenerate — for: Verifies that PDF generation requests with missing or unknown event parameters fail validation, display an error, and produce no authorization PDF.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('rejects an unknown event without producing a PDF', async () => {
        queueTediousRows([]);
        const response = await request(app).post('/authorization-pdf').type('form').send({ eventCode: 'UNKNOWN999' });

        expect(response.status).toBe(404);
        expect(response.text).toContain('Invalid or missing event code.');
        expect(response.headers['content-type']).not.toMatch(/application\/pdf/);
    });
});
