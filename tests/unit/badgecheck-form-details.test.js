import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const assets = path.join(process.cwd(), 'assets');
const markup = fs.readFileSync(path.join(assets, 'registration.html'), 'utf8');
const script = fs.readFileSync(path.join(assets, 'registration.js'), 'utf8');

describe('badge registration details', () => {
    /* treegress:obligation badgecheck.availableform.unit.c1 do-not-regenerate — for: Detail form initialization and state transition logic for available badge check
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('clears and displays details for an available badge', () => {
        expect(script).toContain("details.querySelectorAll('input').forEach(input =>");
        expect(script).toContain('details.hidden = false;');
    });

    /* treegress:obligation badgecheck.fullnamehidden.unit.c1 do-not-regenerate — for: Form structure contract ensuring full name is hidden and name split fields are rendered
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('omits the Full name input while retaining split names', () => {
        expect(markup).not.toContain('name="name"');
        expect(markup).toContain('name="firstName"');
        expect(markup).toContain('name="lastName"');
    });

    /* treegress:obligation badgecheck.derivefullname.unit.c1 do-not-regenerate — for: Full name derivation logic from first name and last name inputs
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('derives the submitted full name from first and last names', () => {
        expect(script).toContain("body.name = [body.firstName, body.lastName].filter(Boolean).join(' ');");
        expect(script).toContain('Badge registered successfully.');
    });

    /* treegress:obligation badgecheck.updatedlabels.unit.c1 do-not-regenerate — for: Label rendering and text constants for location and role fields
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('uses the requested location and role labels', () => {
        expect(markup).toContain('Location/Address');
        expect(markup).toContain('Role (Volunteer/Organizer/Speaker)');
    });

    /* treegress:obligation badgecheck.webcampreserved.unit.c1 do-not-regenerate — for: Webcam scanning event handling and badge check workflow initiation
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('keeps webcam scans connected to badge checking', () => {
        expect(script).toContain('idInput.value = match[1]');
        expect(script).toContain('await checkBadge();');
    });

    /* treegress:obligation badgecheck.manualpreserved.unit.c1 do-not-regenerate — for: Manual badge lookup input handling and workflow submission
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('preserves manual badge lookup', () => {
        expect(markup).toContain('id="check-id"');
        expect(script).toContain("fetch('/registration/status'");
    });

    /* treegress:obligation badgecheck.unavailablebadge.unit.c1 do-not-regenerate — for: Validation and error handling logic for unavailable badge identifiers
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('keeps unavailable badges out of the detail form', () => {
        expect(script).toContain('This badge was not found for the authorized event.');
        expect(script).toContain('details.hidden = true;');
    });

    /* treegress:obligation badgecheck.missingnames.unit.c1 do-not-regenerate — for: Client-side validation rules rejecting empty first and last name fields
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('requires first and last names', () => {
        expect(markup).toContain('name="firstName" required');
        expect(markup).toContain('name="lastName" required');
    });
});
