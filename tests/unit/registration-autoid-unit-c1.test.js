import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import { resetQrMock } from './fixtures/qrcode-mock.js';
import app from '../../server.js';

const EVENT_NAME = 'TreegressAutoIdEvent';
const qrDir = path.join(process.cwd(), 'qr', EVENT_NAME.toLowerCase());

describe('attendee registration without a manual ID', () => {
    beforeEach(() => {
        resetTediousQueue();
        resetQrMock();
    });

    afterEach(() => {
        fs.rmSync(qrDir, { recursive: true, force: true });
    });

    /* treegress:obligation registration.autoid.unit.c1 do-not-regenerate — for: Prove the registration endpoint handler auto-assigns an attendee ID and responds with JSON containing matching id, formatted url, formatted imgsrc, and base64 QR data URL when no manual ID is provided.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('returns a successful JSON response with the assigned id, url, imgsrc, and QR data', async () => {
        queueTediousRows([{ ID: 1001 }]);

        const res = await request(app)
            .get(`/new/${EVENT_NAME}`)
            .set('Host', 'example.com');

        expect(res.ok).toBe(true);
        expect(res.body).toEqual({
            id: 1001,
            url: 'https://example.com/1001',
            imgsrc: 'https://example.com/treegressautoidevent/1001.png',
            data: 'data:image/png;base64,MOCKQRDATA',
        });
    });
});
