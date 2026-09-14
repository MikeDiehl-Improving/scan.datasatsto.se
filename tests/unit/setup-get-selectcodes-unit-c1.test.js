import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

describe('scanner setup with an identifier that has matching reference codes', () => {
    beforeEach(() => {
        resetTediousQueue();
    });

    /* treegress:obligation setup.get.selectcodes.unit.c1 do-not-regenerate — for: Verify scanner setup GET handler with identifier renders selectable options for matching codes with HTML escaping
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('displays the code selection page with each matching code presented as a selectable, safely-encoded option', async () => {
        const agent = request.agent(app);
        queueTediousRows([{ EventID: 1, Event: 'Test event', Expires: '2099-01-01' }]);
        await agent.get('/authorize/00000000-0000-0000-0000-000000000001');
        queueTediousRows([
            { ReferenceCode: 'CODEA' },
            { ReferenceCode: 'A&B<C>D' },
        ]);

        const res = await agent.get('/setup?id=101');

        expect(res.status).toBe(200);
        expect(res.text).toContain('class="code"');
        expect(res.text).toContain('>CODEA<');
        expect(res.text).toContain('A&amp;B&lt;C&gt;D');
        expect(res.text).not.toContain('A&B<C>D');
    });
});
