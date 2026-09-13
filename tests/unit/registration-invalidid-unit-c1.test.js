import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousError, resetTediousQueue } from './fixtures/tedious-mock.js';
import { resetQrMock } from './fixtures/qrcode-mock.js';
import app from '../../server.js';

describe('attendee registration when the database returns no identity recordset', () => {
    beforeEach(() => {
        resetTediousQueue();
        resetQrMock();
    });

    /* treegress:obligation registration.invalidid.unit.c1 do-not-regenerate — for: Prove that when identity lookup returns an empty recordset or falsy identity, the handler renders an unauthorized HTML error response with 'Invalid ID.' and returns no JSON payload.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('returns an HTTP 401 HTML error page with the Invalid ID message and no JSON body', async () => {
        queueTediousError(new Error('simulated statement failure'));

        const res = await request(app).get('/new/TreegressInvalidIdEvent');

        expect(res.status).toBe(401);
        expect(res.text).toContain('Invalid ID.');
        expect(res.body).toEqual({});
    });
});
