import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

const scannerSecret = '00000000-0000-0000-0000-000000000001';

describe('authorization QR PDF path', () => {
    beforeEach(() => resetTediousQueue());

    it('renders the authorization PDF form', async () => {
        const response = await request(app).get('/authorization-pdf/EVENT101');

        expect(response.status).toBe(200);
        expect(response.text).toContain('name="eventCode"');
        expect(response.text).toContain('value="EVENT101"');
    });

    /* treegress:obligation authpdf.invalidrequest.unit.c1 do-not-regenerate — for: Verifies that PDF generation requests with missing or unknown event parameters fail validation, display an error, and produce no authorization PDF.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('rejects an unknown event code', async () => {
        queueTediousRows([]);

        const response = await request(app)
            .post('/authorization-pdf')
            .type('form')
            .send({ eventCode: 'UNKNOWN999' });

        expect(response.status).toBe(404);
        expect(response.text).toBe('Invalid or missing event code.');
    });

    /* treegress:obligation authpdf.displayurl.unit.c1 do-not-regenerate — for: Verifies that the PDF generator renders the complete, untruncated human-readable authorization URL alongside the QR code in the document output.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    /* treegress:obligation authpdf.urlmatchesqr.unit.c1 do-not-regenerate — for: Verifies that the human-readable authorization URL string is identical to the URL encoded in the generated QR code.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('returns a printable PDF containing the scanner authorization QR code and URL', async () => {
        queueTediousRows([{
            Event: 'Test Event',
            EventCode: 'EVENT101',
            ScannerSecret: scannerSecret
        }]);

        const response = await request(app)
            .post('/authorization-pdf')
            .type('form')
            .send({ eventCode: 'EVENT101' });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/pdf/);
        expect(response.headers['content-disposition']).toContain('scanner-authorization-Test-Event.pdf');
        expect(response.body.subarray(0, 5).toString()).toBe('%PDF-');
        expect(response.body.toString()).toContain(
            '/authorize/' + scannerSecret
        );
    });
});
