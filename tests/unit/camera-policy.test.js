import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

describe('camera permissions policy', () => {
    it('allows camera access for this site while denying unrelated device capabilities', async () => {
        const response = await request(app).get('/assets/registration.html');

        expect(response.headers['permissions-policy']).toBe(
            'camera=(self), display-capture=(), microphone=(), geolocation=(), usb=()'
        );
    });
});
