import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

describe('interactive API inputs', () => {
    /* treegress:obligation mainpage.inputdisplay.unit.c1 do-not-regenerate — for: Prove that the main page view or template renders input parameter fields and execution controls for API operations.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('renders parameter input fields', async () => {
        const res = await request(app).get('/');
        expect(res.text).toContain('name="event"');
        expect(res.text).toContain('name="secret"');
        expect(res.text).toContain('name="code"');
        expect(res.text).toContain('type="submit"');
    });
});
