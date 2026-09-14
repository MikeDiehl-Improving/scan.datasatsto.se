import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('event scanner authorization', () => {
    beforeEach(() => {
        resetTediousQueue();
    });

    it('rejects setup on a phone that has not scanned the organizer QR', async () => {
        const res = await request(app).get('/setup');

        expect(res.status).toBe(403);
        expect(res.text).toContain('authorization QR code');
    });

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

        const setup = await agent.get('/setup');
        expect(setup.status).toBe(200);
    });

    it('rejects an invalid or expired organizer QR', async () => {
        queueTediousRows([]);

        const res = await request(app).get('/authorize/00000000-0000-0000-0000-000000000001');

        expect(res.status).toBe(403);
        expect(res.text).toContain('invalid or expired');
    });
});
