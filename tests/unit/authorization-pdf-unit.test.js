import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('authorization QR PDF path', () => {
    beforeEach(() => resetTediousQueue());

    it('renders the authorization PDF form', async () => {
        const response = await request(app).get('/authorization-pdf/EVENT101');

        expect(response.status).toBe(200);
        expect(response.text).toContain('name="eventCode"');
        expect(response.text).toContain('value="EVENT101"');
    });

    it('rejects an unknown event code', async () => {
        queueTediousRows([]);

        const response = await request(app)
            .post('/authorization-pdf')
            .type('form')
            .send({ eventCode: 'UNKNOWN999' });

        expect(response.status).toBe(404);
        expect(response.text).toBe('Invalid or missing event code.');
    });

    it('returns a printable PDF containing the scanner authorization QR code', async () => {
        queueTediousRows([{
            Event: 'Test Event',
            EventCode: 'EVENT101',
            ScannerSecret: '00000000-0000-0000-0000-000000000001'
        }]);

        const response = await request(app)
            .post('/authorization-pdf')
            .type('form')
            .send({ eventCode: 'EVENT101' });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/pdf/);
        expect(response.headers['content-disposition']).toContain('scanner-authorization-Test-Event.pdf');
        expect(response.body.subarray(0, 5).toString()).toBe('%PDF-');
    });
});
