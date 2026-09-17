import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { authorizeScanner, queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('reserved badge registration', () => {
    beforeEach(() => {
        resetTediousQueue();
    });

    it('requires event scanner authorization', async () => {
        const response = await request(app).get('/registration');

        expect(response.status).toBe(403);
        expect(response.text).toContain('authorization QR code');
    });

    it('reports an available reserved badge after authorization', async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent, 7);
        queueTediousRows([{ Status: 'Available' }]);

        const response = await agent
            .post('/registration/status')
            .send({ id: '8000000000', encryptionKey: '' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'available', id: 8000000000 });
    });

    it('rejects an identity that is not part of the authorized event', async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent, 7);
        queueTediousRows([{ Status: 'NotFound' }]);

        const response = await agent
            .post('/registration/status')
            .send({ id: '9000000000', encryptionKey: '' });

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ status: 'not-found' });
    });

    it('returns a conflict when the atomic claim did not update a reserved row', async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent, 7);
        queueTediousRows([{ Claimed: 0 }]);

        const response = await agent
            .post('/registration/claim')
            .send({
                id: '8000000000',
                email: 'person@example.com',
                firstName: 'First',
                lastName: 'Last',
                name: 'First Last',
                description: '',
                title: '',
                phone: '',
                location: '',
                role: '',
            });

        expect(response.status).toBe(409);
        expect(response.body.status).toBe('claimed');
    });
});
