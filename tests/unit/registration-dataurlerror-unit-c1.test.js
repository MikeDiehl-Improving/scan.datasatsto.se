import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import { queueQrToDataURLError, resetQrMock } from './fixtures/qrcode-mock.js';
import app from '../../server.js';

const EVENT_NAME = 'TreegressDataUrlErrorEvent';
const qrDir = path.join(process.cwd(), 'qr', EVENT_NAME.toLowerCase());

describe('attendee registration when QR data URL generation fails', () => {
    beforeEach(() => {
        resetTediousQueue();
        resetQrMock();
    });

    afterEach(() => {
        fs.rmSync(qrDir, { recursive: true, force: true });
    });

    /* treegress:obligation registration.dataurlerror.unit.c1 do-not-regenerate — for: Prove that when QR data URL generation encounters an error after PNG creation, the handler renders a server error HTML response with 'Couldn\'t create the data blob.' and returns no JSON.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it("returns an HTTP 500 HTML error page with the Couldn't create the data blob. message and no JSON body", async () => {
        queueTediousRows([{ ID: 4001 }]);
        queueQrToDataURLError(new Error('simulated data url failure'));

        const res = await request(app).get(`/new/${EVENT_NAME}`);

        expect(res.status).toBe(500);
        expect(res.text).toContain("Couldn't create the data blob.");
        expect(res.body).toEqual({});
    });
});
