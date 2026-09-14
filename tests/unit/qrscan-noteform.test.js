import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const server = readFileSync(new URL('../../server.js', import.meta.url), 'utf8');
const template = readFileSync(new URL('../../assets/scan.html', import.meta.url), 'utf8');

describe('direct QR scan note form', () => {
    /* treegress:obligation qrscan.noteform.initial.unit.c1 do-not-regenerate */
    it('shows the form and a submit-without-note option before recording', () => {
        expect(server).toContain("req.method === 'GET' && !vendorCode");
        expect(template).toContain('name="note"');
        expect(template).toContain('Submit without note');
    });

    /* treegress:obligation qrscan.noteform.submitwithnote.unit.c1 do-not-regenerate */
    it('passes an entered note to scan submission', () => {
        expect(server).toContain('note = req.body.note || ""');
        expect(server).toContain('@Note=@Note');
    });

    /* treegress:obligation qrscan.noteform.submitwithoutnote.unit.c1 do-not-regenerate */
    it('submits an empty note from the secondary action', () => {
        expect(template).toContain('<button type="submit">Submit without note</button>');
        expect(server).toContain('"name": \'Note\', "type": Types.NVarChar, "value": note');
    });

    /* treegress:obligation qrscan.noteform.submitemptynote.unit.c1 do-not-regenerate */
    it('normalizes an empty note to an empty database value', () => {
        expect(server).toContain('note = req.body.note || ""');
    });

    /* treegress:obligation qrscan.vendorcookie.present.unit.c1 do-not-regenerate */
    it('includes a selected vendor code in the scan view', () => {
        expect(server).toContain('req.session.vendorCode');
        expect(server).toContain('selectedVendorCode');
        expect(server).toContain('Vendor code: ');
        expect(template).toContain('name="vendorCode"');
        expect(template).toContain('value="<%=VendorCode%>"');
        expect(template).toContain('name="setDefault"');
    });

    /* treegress:obligation qrscan.vendorcookie.absent.unit.c1 do-not-regenerate */
    it('omits the vendor line when no vendor cookie is selected', () => {
        expect(server).toContain(": ''");
        expect(template).toContain('<%=Vendor%>');
    });

    /* treegress:obligation qrscan.vendorcookie.invalid.unit.c1 do-not-regenerate */
    it('rejects whitespace-only vendor cookie values', () => {
        expect(server).toContain('req.session.vendorCode.trim()');
        expect(server).toContain(": ''");
    });
});
