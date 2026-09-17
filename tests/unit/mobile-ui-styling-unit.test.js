import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../assets/style.css', import.meta.url), 'utf8');
const authorizedTemplate = readFileSync(new URL('../../assets/authorized.html', import.meta.url), 'utf8');

describe('mobile scanner styling', () => {
    it('doubles scan submit control sizing', () => {
        expect(css).toContain('padding: 0.5rem 4rem;');
        expect(css).toContain('font-size: 4rem;');
    });

    it('uses reduced typography on the authorized confirmation page', () => {
        expect(authorizedTemplate).toContain('<body class="scan authorized">');
        expect(css).toContain('body.authorized');
        expect(css).toContain('font-size: 1.5rem;');
    });
});
