import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

const scannerSecret = '00000000-0000-0000-0000-000000000001';

describe('authorization PDF URL target', () => {
    beforeEach(() => resetTediousQueue());

    /* treegress:obligation authpdf.urlmatchesqr.unit.c1 do-not-regenerate — for: Verifies that the human-readable authorization URL string is identical to the URL encoded in the generated QR code.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('uses the same authorization URL for the QR code and displayed text', async () => {
        queueTediousRows([{ Event: 'Test Event', EventCode: 'EVENT101', ScannerSecret: scannerSecret }]);
        const response = await request(app).post('/authorization-pdf').type('form').send({ eventCode: 'EVENT101' });
        const authorizationUrl = response.body.toString().match(/\/URI \(([^)]+)\)/)[1];

        expect(response.body.toString()).toContain(authorizationUrl);
        expect(authorizationUrl).toMatch(new RegExp('/authorize/' + scannerSecret + '$'));
    });
});
