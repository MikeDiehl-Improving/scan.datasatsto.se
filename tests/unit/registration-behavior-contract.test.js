import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const assets = path.join(process.cwd(), 'assets');
const registrationScript = fs.readFileSync(path.join(assets, 'registration.js'), 'utf8');
const registrationMarkup = fs.readFileSync(path.join(assets, 'registration.html'), 'utf8');

describe('registration browser behavior contract', () => {
    /* treegress:obligation registration.webcamunsupported.unit.c1 do-not-regenerate — for: Proves that when webcam capabilities are unsupported, a clear notification message is displayed and manual ID entry input and submit controls remain visible and interactive.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('keeps manual entry available when webcam scanning is unsupported', () => {
        expect(registrationScript).toContain('does not support webcam QR scanning');
        expect(registrationMarkup).toContain('id="identity-id"');
        expect(registrationMarkup).toContain('id="check-id"');
    });

    /* treegress:obligation registration.webcamsupported.unit.c1 do-not-regenerate — for: Proves that when webcam scanning is supported, the QR webcam scanner interface is initialized and accessible alongside manual ID entry controls.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('initializes the QR scanner alongside manual entry controls', () => {
        expect(registrationScript).toContain('new BarcodeDetector');
        expect(registrationMarkup).toContain('id="start-camera"');
        expect(registrationMarkup).toContain('id="identity-id"');
    });

    /* treegress:obligation registration.manualentryfallback.unit.c1 do-not-regenerate — for: Proves that entering a registration identifier into the manual ID entry field processes the submission and displays the registration outcome confirmation.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('processes manual identifier entry and displays its outcome', () => {
        expect(registrationScript).toContain('fetch(\'/registration/status\'');
        expect(registrationScript).toContain('statusMessage.textContent');
    });

    /* treegress:obligation registration.webcam.scanbadge.unit.c1 do-not-regenerate — for: Verify that presenting a valid attendee badge code registers the attendee and returns a confirmation success status message.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('submits the scanned identifier and renders the registration success message', () => {
        expect(registrationScript).toContain('idInput.value = match[1]');
        expect(registrationScript).toContain('Badge registered successfully.');
    });

    /* treegress:obligation registration.webcam.invalidscan.unit.c1 do-not-regenerate — for: Verify that scanning an invalid or unassigned badge code prevents registration and returns an unrecognized badge error status message.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('rejects an unrecognized scanned code with a visible status message', () => {
        expect(registrationScript).toContain('That QR code is not a badge QR code.');
        expect(registrationScript).toContain("statusMessage.textContent = result.status === 'claimed'");
    });

    /* treegress:obligation registration.manualentry.validid.unit.c1 do-not-regenerate — for: Verify that submitting a valid identity identifier accepts registration, generates a success status message, and resets or prepares the input field for subsequent entry.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('supports valid manual identity entry and prepares the form after registration', () => {
        expect(registrationMarkup).toContain('id="identity-id"');
        expect(registrationScript).toContain("details.hidden = true;");
        expect(registrationScript).toContain('Badge registered successfully.');
    });

    /* treegress:obligation registration.manualentry.invalidid.unit.c1 do-not-regenerate — for: Verify that submitting an unrecognized identity identifier rejects registration and yields a verification error status message.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('renders a verification error for an unrecognized manual identity', () => {
        expect(registrationScript).toContain('This badge was not found for the authorized event.');
        expect(registrationScript).toContain('Unable to check the badge.');
    });

    /* treegress:obligation registration.manualentry.blankid.unit.c1 do-not-regenerate — for: Verify that submitting the manual identity form with an empty identifier field prevents registration and generates a validation prompt message.
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('requires an identity identifier before manual submission', () => {
        expect(registrationMarkup).toContain('name="id" inputmode="numeric" required');
        expect(registrationMarkup).toContain('id="check-id"');
    });
});
