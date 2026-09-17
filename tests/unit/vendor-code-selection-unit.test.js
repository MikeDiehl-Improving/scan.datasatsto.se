import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { authorizeScanner, queueTediousRows, resetTediousQueue } from './fixtures/tedious-mock.js';
import app from '../../server.js';

const selectorScript = readFileSync(new URL('../../assets/vendor-code-selector.js', import.meta.url), 'utf8');

describe('vendor code selection', () => {
    beforeEach(() => {
        resetTediousQueue();
    });

    /* treegress:obligation setup.optionsshown.unit.c1 do-not-regenerate — for: Verify setup route template and view-model render existing registered vendor codes and include an option to enter a new code
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('shows registered codes and an explicit new-code option on setup', async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent);
        queueTediousRows([{ ReferenceCode: 'VENDOR1' }, { ReferenceCode: 'VENDOR2' }]);

        const response = await agent.get('/setup');

        expect(response.text).toContain('>VENDOR1<');
        expect(response.text).toContain('>VENDOR2<');
        expect(response.text).toContain('Enter a new vendor code');
    });

    /* treegress:obligation setup.newcodeinputrevealed.unit.c1 do-not-regenerate — for: Verify client-side form interaction logic reveals the text input when the new vendor code option is selected
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('reveals and requires the new-code input for the new-code selection', () => {
        expect(selectorScript).toContain('newCode.hidden = !isNewCode');
        expect(selectorScript).toContain('newCode.required = isNewCode');
    });

    /* treegress:obligation scan.optionsshown.unit.c1 do-not-regenerate — for: Verify scan view renders selectable existing vendor codes and an option to enter a new code
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('shows registered codes and an explicit new-code option on the scan page', async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent);
        await agent.post('/setup').send({ vendorCode: 'VENDOR1' });
        queueTediousRows([{ ReferenceCode: 'VENDOR1' }, { ReferenceCode: 'VENDOR2' }]);

        const response = await agent.get('/12345');

        expect(response.text).toContain('>VENDOR1<');
        expect(response.text).toContain('>VENDOR2<');
        expect(response.text).toContain('Enter a new vendor code');
    });

    it('rejects a setup submission without a vendor code', async () => {
        const agent = request.agent(app);
        await authorizeScanner(agent);

        const response = await agent.post('/setup').send({ vendorCodeChoice: '__new__', newVendorCode: '   ' });

        expect(response.status).toBe(400);
        expect(response.text).toContain('A vendor code is required.');
    });
});
