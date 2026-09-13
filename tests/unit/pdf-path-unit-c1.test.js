import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

const identityRecord = {
    id: 101,
    name: 'Ada Lovelace',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.test',
    description: 'Analytical Engine',
    title: 'Engineer',
    location: 'London'
};

function queueEventIdentities(identities = [identityRecord]) {
    queueTediousRows([{
        blob: JSON.stringify({
            eventId: 'EVENT101',
            eventName: 'Test Event',
            identities
        })
    }]);
}

describe('PDF path', () => {
    beforeEach(() => resetTediousQueue());

    /* treegress:obligation pdf.form.render.unit.c1 do-not-regenerate — for: Verify the badge PDF generator endpoint/view renders the form with input fields for badge records and interactive layout/formatting options for a valid active event identifier.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('renders the badge form and its layout controls', async () => {
        const response = await request(app).get('/pdf/EVENT101');

        expect(response.status).toBe(200);
        expect(response.text).toContain('<form action="/pdf" method="post"');
        expect(response.text).toContain('name="identities"');
        expect(response.text).toContain('name="paperSize"');
        expect(response.text).toContain('name="qrSize"');
        expect(response.text).toContain('name="badgeCount"');
        expect(response.text).toContain('name="fontSize"');
    });

    /* treegress:obligation pdf.form.unknownevent.unit.c1 do-not-regenerate — for: Validate route handler rejects non-existent event identifiers and returns an error response
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('rejects PDF generation for an unknown event', async () => {
        const response = await request(app).post('/pdf').type('form').send({
            event: 'UNKNOWN999'
        });

        expect(response.status).toBe(401);
        expect(response.text).toContain('Invalid or missing event.');
        expect(response.text).not.toContain('<form action="/pdf" method="post"');
    });

    /* treegress:obligation pdf.generate.success.unit.c1 do-not-regenerate — for: Verify PDF generation service/endpoint accepts valid badge recipient data with default options and generates a valid PDF document containing the submitted data.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('returns a PDF for valid badge data', async () => {
        queueEventIdentities();

        const response = await request(app).post('/pdf').type('form').send({
            event: 'EVENT101',
            identities: 'id,name\n101,Ada Lovelace'
        });

        expect(response.status).toBe(200);
        expect(response.body.subarray(0, 5).toString()).toBe('%PDF-');
    });

    /* treegress:obligation pdf.generate.customoptions.unit.c1 do-not-regenerate — for: Verify the PDF generation logic correctly incorporates custom options (layout, dimensions, style) into the generated PDF output.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('applies custom paper and badge options to the PDF response', async () => {
        queueEventIdentities();

        const response = await request(app).post('/pdf').type('form').send({
            event: 'EVENT101',
            paperSize: 'LETTER',
            qrSize: '0.35',
            badgeCount: '1,1',
            fontSize: '24',
            identities: 'id,name\n101,Ada Lovelace'
        });

        expect(response.status).toBe(200);
        expect(response.body.subarray(0, 5).toString()).toBe('%PDF-');
        expect(response.body.toString('latin1')).toContain('/MediaBox [0 0 612 792]');
    });

    /* treegress:obligation pdf.generate.missingdata.unit.c1 do-not-regenerate — for: Verify validation logic rejects submissions missing required badge data, returns the appropriate error message, and does not produce a PDF.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('rejects a database response without identities', async () => {
        queueTediousRows([{ blob: JSON.stringify({ eventName: 'Test Event' }) }]);

        const response = await request(app).post('/pdf').type('form').send({ event: 'EVENT101' });

        expect(response.status).toBe(400);
        expect(response.text).toBe('No identities found.');
        expect(response.headers['content-type']).not.toMatch(/application\/pdf/);
    });

    /* treegress:obligation pdf.generate.invaliddata.unit.c1 do-not-regenerate — for: Verify the parser and validation handlers reject malformed/unparseable badge data, display an invalid format message, and prevent PDF generation.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('rejects badge rows with an invalid identity id', async () => {
        const response = await request(app).post('/pdf').type('form').send({
            event: 'EVENT101',
            identities: 'id,name\nnot-a-number,Ada Lovelace'
        });

        expect(response.status).toBe(400);
        expect(response.text).toBe('Each submitted identity must have a valid id.');
        expect(response.headers['content-type']).not.toMatch(/application\/pdf/);
    });
});
