import { describe, it, expect } from 'vitest';
import { navigateApiCall } from '../../assets/index.js';
import { TestFormData, row } from './mainpage-api-test-helpers.js';

describe('Run call navigation', () => {
    /* treegress:obligation apidocs.navigatestatic.unit.c1 do-not-regenerate — for: Verify client logic binds parameterless endpoint Run call button to direct navigation instead of inline response fetching
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('navigates a parameterless endpoint without fetching a response', () => {
        let navigatedTo;
        navigateApiCall(row('/stored-procedures'), new TestFormData({}), url => {
            navigatedTo = url;
        });
        expect(navigatedTo).toBe('/stored-procedures');
    });

    /* treegress:obligation apidocs.navigatewithparams.unit.c1 do-not-regenerate — for: Verify client URL construction and navigation triggering for single parameterized endpoint
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('navigates with a supplied parameter', () => {
        let navigatedTo;
        navigateApiCall(row('/report/:event'), new TestFormData({ event: '101' }), url => {
            navigatedTo = url;
        });
        expect(navigatedTo).toBe('/report/101');
    });

    /* treegress:obligation apidocs.navigatemultipleparams.unit.c1 do-not-regenerate — for: Verify composite URL resolution and navigation dispatch when handling multiple endpoint parameters
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('navigates with multiple supplied parameters', () => {
        let navigatedTo;
        navigateApiCall(row('/random/:event/:vendorCode'), new TestFormData({ event: '5', vendorCode: 'test' }), url => {
            navigatedTo = url;
        });
        expect(navigatedTo).toBe('/random/5/test');
    });

    /* treegress:obligation apidocs.navigateencodedparams.unit.c1 do-not-regenerate — for: Verify URL encoding logic for parameter values containing spaces and special characters prior to navigation
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('encodes parameter values before navigation', () => {
        let navigatedTo;
        navigateApiCall(row('/report/:event'), new TestFormData({ event: 'badge alpha/1' }), url => {
            navigatedTo = url;
        });
        expect(navigatedTo).toBe('/report/badge%20alpha%2F1');
    });

    /* treegress:obligation apidocs.emptyparams.unit.c1 do-not-regenerate — for: Prove that omitted endpoint parameters do not trigger an inline asynchronous fetch or response rendering
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('does not navigate or fetch when a required parameter is omitted', () => {
        expect(() => navigateApiCall(row('/report/:event'), new TestFormData({}), () => {
            throw new Error('navigation should not occur');
        })).toThrow('event is required');
    });

    /* treegress:obligation apidocs.everyendpointbutton.unit.c1 do-not-regenerate — for: Verify all endpoint Run call buttons use direct browser navigation instead of inline fetching
       authored via treegress_author_tests (SPEC §7.4 amendment #53); assert EXACTLY the then-clauses below. Keep this marker and do not rename the file (run-result correlation is by the obligation id, SPEC §12.3 amendment #34). */
    it('uses navigation for every endpoint method', () => {
        const calls = [
            ['/new/:event', { event: '5' }, '/new/5'],
            ['/new/:event/:id', { event: '5', id: '101' }, '/new/5/101'],
            ['/setup', {}, '/setup'],
            ['/:id/:vendorCode', { id: '101', vendorCode: 'test' }, '/101/test'],
            ['/:id', { id: '101' }, '/101'],
            ['/report/:event', { event: '5' }, '/report/5'],
            ['/random/:event', { event: '5' }, '/random/5'],
            ['/random/:event/:vendorCode', { event: '5', vendorCode: 'test' }, '/random/5/test'],
            ['/expire', {}, '/expire']
        ];
        for (const [path, values, expectedUrl] of calls) {
            let navigatedTo;
            navigateApiCall(row(path), new TestFormData(values), url => {
                navigatedTo = url;
            });
            expect(navigatedTo).toBe(expectedUrl);
        }
    });
});
