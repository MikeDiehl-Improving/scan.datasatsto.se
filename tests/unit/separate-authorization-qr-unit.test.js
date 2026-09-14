import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

const scannerSecret = '00000000-0000-0000-0000-000000000001';

describe('separate authorization QR flow', () => {
    beforeEach(() => resetTediousQueue());

    /* treegress:obligation mainpage.unauthorized.unit.c1 do-not-regenerate — for: Proves that an unauthorized request to the main page is blocked from viewing main content and redirected or presented with an authorization prompt
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('blocks the main page for an unauthorized visitor', async () => {
        const response = await request(app).get('/');

        expect(response.status).toBe(403);
        expect(response.text).not.toContain('scan.datasatsto.se API');
        expect(response.text).toContain('authorization QR code');
    });

    /* treegress:obligation authqr.display.unit.c1 do-not-regenerate — for: Proves that the dedicated authorization QR code interface renders the QR code while main page content remains unexposed
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('keeps the authorization QR generator available separately', async () => {
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
        expect(response.body.subarray(0, 5).toString()).toBe('%PDF-');
        expect(response.body.toString()).not.toContain('scan.datasatsto.se API');
    });

    /* treegress:obligation authqr.complete.unit.c1 do-not-regenerate — for: Proves that completing authorization via the QR code establishes an authorized session and enables access to the main page
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    /* treegress:obligation authpdf.manualauthorization.unit.c1 do-not-regenerate — for: Verifies that navigating directly to the authorization URL authorizes the device and produces setup confirmation.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('grants main page access after processing a valid authorization QR', async () => {
        const agent = request.agent(app);
        queueTediousRows([{ EventID: 7, Event: 'Test event', Expires: '2099-01-01' }]);

        const authorization = await agent.get(`/authorize/${scannerSecret}`);
        const mainPage = await agent.get('/');

        expect(authorization.status).toBe(200);
        expect(mainPage.status).toBe(200);
        expect(mainPage.text).toContain('scan.datasatsto.se API');
    });

    /* treegress:obligation mainpage.authorized.unit.c1 do-not-regenerate — for: Proves that a visitor with a valid authorized session successfully views the main page content
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('shows the main page to an authorized visitor', async () => {
        const agent = request.agent(app);
        queueTediousRows([{ EventID: 7, Event: 'Test event', Expires: '2099-01-01' }]);
        await agent.get(`/authorize/${scannerSecret}`);

        const response = await agent.get('/');

        expect(response.status).toBe(200);
        expect(response.text).toContain('/setup');
    });

    /* treegress:obligation authqr.invalid.unit.c1 do-not-regenerate — for: Proves that submitting an invalid authorization code displays an error message, keeps the visitor unauthorized, and denies main page access
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    /* treegress:obligation authpdf.expiredurl.unit.c1 do-not-regenerate — for: Verifies that navigating to an expired or revoked authorization URL denies authorization and displays an expired link error.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('keeps an invalid authorization attempt unauthorized', async () => {
        queueTediousRows([]);
        const agent = request.agent(app);

        const authorization = await agent.get(`/authorize/${scannerSecret}`);
        const mainPage = await agent.get('/');

        expect(authorization.status).toBe(403);
        expect(authorization.text).toContain('invalid or expired');
        expect(mainPage.status).toBe(403);
        expect(mainPage.text).not.toContain('scan.datasatsto.se API');
    });

    /* treegress:obligation mainpage.expired.unit.c1 do-not-regenerate — for: Proves that an expired authorization session prevents access to main page content and prompts the visitor to re-authorize
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('blocks the main page when authorization has expired', async () => {
        const agent = request.agent(app);
        queueTediousRows([{ EventID: 7, Event: 'Test event', Expires: '2000-01-01' }]);
        await agent.get(`/authorize/${scannerSecret}`);

        const response = await agent.get('/');

        expect(response.status).toBe(403);
        expect(response.text).not.toContain('scan.datasatsto.se API');
        expect(response.text).toContain('authorization QR code');
    });
});
