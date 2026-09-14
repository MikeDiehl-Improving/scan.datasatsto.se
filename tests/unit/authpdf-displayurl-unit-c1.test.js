import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

const scannerSecret = '00000000-0000-0000-0000-000000000001';

describe('authorization PDF URL display', () => {
    beforeEach(() => resetTediousQueue());

    /* treegress:obligation authpdf.displayurl.unit.c1 do-not-regenerate — for: Verifies that the PDF generator renders the complete, untruncated human-readable authorization URL alongside the QR code in the document output.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('displays the complete authorization URL alongside the QR code', async () => {
        queueTediousRows([{ Event: 'Test Event', EventCode: 'EVENT101', ScannerSecret: scannerSecret }]);
        const response = await request(app).post('/authorization-pdf').type('form').send({ eventCode: 'EVENT101' });
        const authorizationUrl = response.body.toString().match(/\/URI \(([^)]+)\)/)[1];

        expect(response.status).toBe(200);
        expect(response.body.toString()).toContain(authorizationUrl);
        expect(authorizationUrl).toMatch(new RegExp('/authorize/' + scannerSecret + '$'));
    });
});
