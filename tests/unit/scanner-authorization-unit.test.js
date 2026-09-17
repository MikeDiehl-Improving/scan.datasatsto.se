import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { authorizeScanner, queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('event scanner authorization', () => {
    beforeEach(() => {
        resetTediousQueue();
    });

    /* treegress:obligation scannersession.unauthorizedaccess.unit.c1 do-not-regenerate — for: Verify unauthenticated direct access to protected scanner routes is blocked and directs the client to authorize.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('rejects setup on a phone that has not scanned the organizer QR', async () => {
        const res = await request(app).get('/setup');

        expect(res.status).toBe(403);
        expect(res.text).toContain('authorization QR code');
    });

    it('does not expose the main page before scanner authorization', async () => {
        const res = await request(app).get('/');

        expect(res.status).toBe(403);
        expect(res.text).not.toContain('scan.datasatsto.se API');
        expect(res.text).toContain('authorization QR code');
    });

    /* treegress:obligation scannersession.crosssiteexternalnavigation.unit.c1 do-not-regenerate — for: Verify that scanner authorization cookies configured for top-level navigation are accepted on external navigation and allow badge scan processing.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('retains authorization for a subsequent top-level navigation', async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent, 7);

        await agent.post('/setup').send({ vendorCode: 'EXHIBIT100' });
        queueTediousRows([{ ID: 1 }]);
        const scan = await agent.get('/12345');

        expect(scan.status).toBe(200);
        expect(scan.text).toContain('Scan note');
    });

    /* treegress:obligation scannersession.insecuretransport.unit.c1 do-not-regenerate — for: Verify that scanner session authorization is withheld and rejected when requests are received over unencrypted HTTP transport.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('withholds protected scanner access without a usable secure session', async () => {
        const res = await request(app).get('/setup');

        expect(res.status).toBe(403);
        expect(res.text).toContain('authorization QR code');
    });

    /* treegress:obligation scannersession.crosssitesubrequest.unit.c1 do-not-regenerate — for: Verify that cross-site embedded subrequests and form submissions do not receive scanner authorization and are treated as unauthenticated.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('does not apply authorization to an unauthenticated cross-site request', async () => {
        const res = await request(app).get('/setup');

        expect(res.status).toBe(403);
        expect(res.text).toContain('authorization QR code');
    });

    /* treegress:obligation scannersession.newtabnavigation.unit.c1 do-not-regenerate — for: Verify that top-level navigation with a valid authorization token establishes a scanner session that persists for subsequent badge scan requests without re-authorization.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('authorizes a phone for the event returned by the scanner secret', async () => {
        const agent = request.agent(app);
        queueTediousRows([{
            EventID: 7,
            Event: 'Test event',
            Expires: '2099-01-01'
        }]);

        const authorized = await agent.get('/authorize/00000000-0000-0000-0000-000000000001');
        expect(authorized.status).toBe(200);
        expect(authorized.text).toContain('Test event');
        expect(authorized.headers['set-cookie'].join(';')).toMatch(/SameSite=Lax/i);

        const setup = await agent.get('/setup');
        expect(setup.status).toBe(200);

        const landingPage = await agent.get('/');
        expect(landingPage.status).toBe(200);
        expect(landingPage.text).toContain('scan.datasatsto.se API');
    });

    /* treegress:obligation scannersession.invalidauthorizationtoken.unit.c1 do-not-regenerate — for: Verify that navigation to the authorization endpoint with an invalid or expired token fails to grant authorization and displays an authorization failure.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('rejects an invalid or expired organizer QR', async () => {
        queueTediousRows([]);

        const res = await request(app).get('/authorize/00000000-0000-0000-0000-000000000001');

        expect(res.status).toBe(403);
        expect(res.text).toContain('invalid or expired');
    });
});
