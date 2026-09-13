import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import { resetQrMock } from './fixtures/qrcode-mock.js';
import app from '../../server.js';

const EVENT_NAME = 'TreegressManualIdEvent';
const qrDir = path.join(process.cwd(), 'qr', EVENT_NAME.toLowerCase());

describe('attendee registration with a manual numeric ID', () => {
    beforeEach(() => {
        resetTediousQueue();
        resetQrMock();
    });

    afterEach(() => {
        fs.rmSync(qrDir, { recursive: true, force: true });
    });

    /* treegress:obligation registration.manualid.unit.c1 do-not-regenerate — for: Prove the registration endpoint handler preserves the manual numeric ID parameter and returns JSON containing matching id, formatted url, formatted imgsrc, and base64 QR data URL.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('returns a successful JSON response with the manual id, url, imgsrc, and QR data', async () => {
        queueTediousRows([{ ID: 2048 }]);

        const res = await request(app)
            .get(`/new/${EVENT_NAME}/2048`)
            .set('Host', 'example.com');

        expect(res.ok).toBe(true);
        expect(res.body).toEqual({
            id: 2048,
            url: 'https://example.com/2048',
            imgsrc: 'https://example.com/treegressmanualidevent/2048.png',
            data: 'data:image/png;base64,MOCKQRDATA',
        });
    });
});
